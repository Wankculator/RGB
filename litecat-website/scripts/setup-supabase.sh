#!/bin/bash

# LIGHTCAT Supabase Database Setup Script
# Automates database configuration for production

set -euo pipefail

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${YELLOW}🗄️ LIGHTCAT Supabase Setup${NC}"
echo "============================="
echo ""

# Function to check prerequisites
check_prerequisites() {
    echo -e "${BLUE}📋 Checking Prerequisites...${NC}"
    
    # Check psql
    if ! command -v psql &> /dev/null; then
        echo -e "${YELLOW}⚠️  PostgreSQL client not installed${NC}"
        echo "Installing psql..."
        sudo apt update
        sudo apt install -y postgresql-client
    fi
    echo -e "${GREEN}✅ PostgreSQL client ready${NC}"
    
    # Check if .env exists
    if [ ! -f ".env" ]; then
        echo -e "${YELLOW}⚠️  .env file not found${NC}"
        echo "Creating from example..."
        cp .env.example .env
    fi
    
    echo ""
}

# Function to get Supabase credentials
get_supabase_credentials() {
    echo -e "${BLUE}🔑 Supabase Credentials${NC}"
    echo ""
    echo "Please provide your Supabase project details:"
    echo "(Find these in your Supabase dashboard > Settings > API)"
    echo ""
    
    read -p "Supabase URL (https://xxxxx.supabase.co): " SUPABASE_URL
    read -p "Supabase Anon Key: " SUPABASE_ANON_KEY
    read -p "Supabase Service Role Key: " SUPABASE_SERVICE_KEY
    read -p "Database Password: " -s DATABASE_PASSWORD
    echo ""
    
    # Extract project ref from URL
    PROJECT_REF=$(echo $SUPABASE_URL | sed 's/https:\/\/\(.*\)\.supabase\.co/\1/')
    DATABASE_URL="postgresql://postgres:${DATABASE_PASSWORD}@db.${PROJECT_REF}.supabase.co:5432/postgres"
    
    echo ""
    echo -e "${GREEN}✅ Credentials configured${NC}"
    echo ""
}

# Function to test database connection
test_database_connection() {
    echo -e "${BLUE}🧪 Testing Database Connection...${NC}"
    
    if psql "$DATABASE_URL" -c "SELECT version();" &> /dev/null; then
        echo -e "${GREEN}✅ Database connection successful${NC}"
    else
        echo -e "${RED}❌ Failed to connect to database${NC}"
        echo "Please check your credentials and try again"
        exit 1
    fi
    echo ""
}

# Function to run database migrations
run_database_migrations() {
    echo -e "${BLUE}🔄 Running Database Migrations...${NC}"
    
    # Check if schema file exists
    if [ ! -f "database/rgb-schema.sql" ]; then
        echo -e "${RED}❌ Schema file not found: database/rgb-schema.sql${NC}"
        exit 1
    fi
    
    # Run migrations
    echo "Creating tables..."
    psql "$DATABASE_URL" < database/rgb-schema.sql
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ Database schema created successfully${NC}"
    else
        echo -e "${RED}❌ Migration failed${NC}"
        exit 1
    fi
    echo ""
}

# Function to setup Row Level Security
setup_row_level_security() {
    echo -e "${BLUE}🔒 Setting up Row Level Security...${NC}"
    
    psql "$DATABASE_URL" << 'EOF'
-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE rgb_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE rgb_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE rgb_consignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_scores ENABLE ROW LEVEL SECURITY;

-- Create policies for users table
CREATE POLICY "Users can view own profile" ON users
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON users
    FOR UPDATE USING (auth.uid() = id);

-- Create policies for rgb_invoices
CREATE POLICY "Users can view own invoices" ON rgb_invoices
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage all invoices" ON rgb_invoices
    FOR ALL USING (auth.role() = 'service_role');

-- Create policies for rgb_payments
CREATE POLICY "Users can view own payments" ON rgb_payments
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM rgb_invoices 
            WHERE rgb_invoices.id = rgb_payments.invoice_id 
            AND rgb_invoices.user_id = auth.uid()
        )
    );

CREATE POLICY "Service role can manage all payments" ON rgb_payments
    FOR ALL USING (auth.role() = 'service_role');

-- Create policies for game_scores
CREATE POLICY "Users can view all scores" ON game_scores
    FOR SELECT USING (true);

CREATE POLICY "Users can insert own scores" ON game_scores
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own scores" ON game_scores
    FOR UPDATE USING (auth.uid() = user_id);

-- Grant permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
EOF

    echo -e "${GREEN}✅ Row Level Security configured${NC}"
    echo ""
}

# Function to create database functions
create_database_functions() {
    echo -e "${BLUE}🔧 Creating Database Functions...${NC}"
    
    psql "$DATABASE_URL" << 'EOF'
-- Function to get user stats
CREATE OR REPLACE FUNCTION get_user_stats(user_uuid UUID)
RETURNS TABLE (
    total_tokens_purchased BIGINT,
    total_batches_purchased INTEGER,
    total_spent_sats BIGINT,
    highest_game_score INTEGER,
    first_purchase_date TIMESTAMPTZ,
    last_purchase_date TIMESTAMPTZ
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COALESCE(SUM(rgb_invoices.token_amount), 0) as total_tokens_purchased,
        COALESCE(SUM(rgb_invoices.batches), 0) as total_batches_purchased,
        COALESCE(SUM(rgb_invoices.btc_amount), 0) as total_spent_sats,
        COALESCE(MAX(game_scores.score), 0) as highest_game_score,
        MIN(rgb_invoices.created_at) as first_purchase_date,
        MAX(rgb_invoices.created_at) as last_purchase_date
    FROM users
    LEFT JOIN rgb_invoices ON users.id = rgb_invoices.user_id AND rgb_invoices.status = 'delivered'
    LEFT JOIN game_scores ON users.id = game_scores.user_id
    WHERE users.id = user_uuid
    GROUP BY users.id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get global stats
CREATE OR REPLACE FUNCTION get_global_stats()
RETURNS TABLE (
    total_users INTEGER,
    total_tokens_sold BIGINT,
    total_batches_sold INTEGER,
    total_revenue_sats BIGINT,
    unique_players INTEGER,
    highest_score INTEGER,
    avg_score NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(DISTINCT users.id)::INTEGER as total_users,
        COALESCE(SUM(rgb_invoices.token_amount), 0) as total_tokens_sold,
        COALESCE(SUM(rgb_invoices.batches), 0) as total_batches_sold,
        COALESCE(SUM(rgb_invoices.btc_amount), 0) as total_revenue_sats,
        COUNT(DISTINCT game_scores.user_id)::INTEGER as unique_players,
        COALESCE(MAX(game_scores.score), 0) as highest_score,
        COALESCE(AVG(game_scores.score), 0) as avg_score
    FROM users
    LEFT JOIN rgb_invoices ON users.id = rgb_invoices.user_id AND rgb_invoices.status = 'delivered'
    LEFT JOIN game_scores ON users.id = game_scores.user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to clean expired invoices
CREATE OR REPLACE FUNCTION cleanup_expired_invoices()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM rgb_invoices 
    WHERE status = 'pending' 
    AND expires_at < NOW()
    AND created_at < NOW() - INTERVAL '1 hour';
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
EOF

    echo -e "${GREEN}✅ Database functions created${NC}"
    echo ""
}

# Function to create indexes
create_indexes() {
    echo -e "${BLUE}📊 Creating Performance Indexes...${NC}"
    
    psql "$DATABASE_URL" << 'EOF'
-- Indexes for rgb_invoices
CREATE INDEX IF NOT EXISTS idx_rgb_invoices_user_id ON rgb_invoices(user_id);
CREATE INDEX IF NOT EXISTS idx_rgb_invoices_status ON rgb_invoices(status);
CREATE INDEX IF NOT EXISTS idx_rgb_invoices_payment_hash ON rgb_invoices(payment_hash);
CREATE INDEX IF NOT EXISTS idx_rgb_invoices_expires_at ON rgb_invoices(expires_at);
CREATE INDEX IF NOT EXISTS idx_rgb_invoices_created_at ON rgb_invoices(created_at);

-- Indexes for rgb_payments
CREATE INDEX IF NOT EXISTS idx_rgb_payments_invoice_id ON rgb_payments(invoice_id);
CREATE INDEX IF NOT EXISTS idx_rgb_payments_paid_at ON rgb_payments(paid_at);

-- Indexes for game_scores
CREATE INDEX IF NOT EXISTS idx_game_scores_user_id ON game_scores(user_id);
CREATE INDEX IF NOT EXISTS idx_game_scores_score ON game_scores(score DESC);
CREATE INDEX IF NOT EXISTS idx_game_scores_created_at ON game_scores(created_at);

-- Composite indexes
CREATE INDEX IF NOT EXISTS idx_rgb_invoices_user_status ON rgb_invoices(user_id, status);
CREATE INDEX IF NOT EXISTS idx_game_scores_user_score ON game_scores(user_id, score DESC);
EOF

    echo -e "${GREEN}✅ Indexes created${NC}"
    echo ""
}

# Function to insert test data (optional)
insert_test_data() {
    echo -e "${BLUE}🧪 Insert Test Data?${NC}"
    read -p "Would you like to insert test data? (y/n): " insert_test
    
    if [[ $insert_test != "y" ]]; then
        return
    fi
    
    psql "$DATABASE_URL" << 'EOF'
-- Insert test user
INSERT INTO users (email, created_at) 
VALUES ('test@lightcat.xyz', NOW())
ON CONFLICT (email) DO NOTHING;

-- Insert test game scores
WITH test_user AS (
    SELECT id FROM users WHERE email = 'test@lightcat.xyz' LIMIT 1
)
INSERT INTO game_scores (user_id, score, game_duration, tier_unlocked)
SELECT 
    test_user.id,
    (RANDOM() * 30 + 10)::INTEGER,
    (RANDOM() * 20 + 10)::INTEGER,
    CASE 
        WHEN RANDOM() < 0.33 THEN 'bronze'
        WHEN RANDOM() < 0.66 THEN 'silver'
        ELSE 'gold'
    END
FROM test_user, generate_series(1, 5);

-- Get stats
SELECT * FROM get_global_stats();
EOF

    echo -e "${GREEN}✅ Test data inserted${NC}"
    echo ""
}

# Function to setup backup script
setup_backup_script() {
    echo -e "${BLUE}💾 Creating Backup Script...${NC}"
    
    cat > scripts/backup-supabase.sh << EOF
#!/bin/bash
# Supabase backup script

DATABASE_URL="$DATABASE_URL"
BACKUP_DIR=~/lightcat-backups/supabase
mkdir -p \$BACKUP_DIR

# Create backup
BACKUP_FILE="\$BACKUP_DIR/lightcat-\$(date +%Y%m%d-%H%M%S).sql.gz"
pg_dump "\$DATABASE_URL" | gzip > "\$BACKUP_FILE"

echo "✅ Backup created: \$BACKUP_FILE"

# Keep only last 7 days of backups
find \$BACKUP_DIR -name "*.sql.gz" -mtime +7 -delete
EOF

    chmod +x scripts/backup-supabase.sh
    
    echo -e "${GREEN}✅ Backup script created${NC}"
    echo ""
}

# Function to update .env file
update_env_file() {
    echo -e "${BLUE}📝 Updating .env file...${NC}"
    
    # Backup current .env
    cp .env .env.backup
    
    # Update Supabase variables
    sed -i "s|SUPABASE_URL=.*|SUPABASE_URL=$SUPABASE_URL|" .env
    sed -i "s|SUPABASE_ANON_KEY=.*|SUPABASE_ANON_KEY=$SUPABASE_ANON_KEY|" .env
    sed -i "s|SUPABASE_SERVICE_ROLE_KEY=.*|SUPABASE_SERVICE_ROLE_KEY=$SUPABASE_SERVICE_KEY|" .env
    
    echo -e "${GREEN}✅ .env file updated${NC}"
    echo ""
}

# Function to display summary
display_summary() {
    echo -e "${GREEN}🎉 SUPABASE SETUP COMPLETE!${NC}"
    echo "=============================="
    echo ""
    echo "Database configured with:"
    echo "- ✅ All tables created"
    echo "- ✅ Row Level Security enabled"
    echo "- ✅ Database functions created"
    echo "- ✅ Performance indexes added"
    echo "- ✅ Backup script ready"
    echo ""
    echo "Connection Details:"
    echo "- Project: $PROJECT_REF"
    echo "- Region: Automatically detected"
    echo ""
    echo "Next Steps:"
    echo "1. Test the connection from your app"
    echo "2. Set up regular backups:"
    echo "   crontab -e"
    echo "   0 3 * * * ~/litecat-website/scripts/backup-supabase.sh"
    echo ""
    echo "3. Monitor usage in Supabase dashboard"
    echo "4. Set up database webhooks if needed"
    echo ""
    echo -e "${YELLOW}⚠️  Keep your service role key secure!${NC}"
}

# Main execution
main() {
    check_prerequisites
    get_supabase_credentials
    test_database_connection
    run_database_migrations
    setup_row_level_security
    create_database_functions
    create_indexes
    insert_test_data
    setup_backup_script
    update_env_file
    display_summary
}

# Run main function
main