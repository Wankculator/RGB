import bpy
import mathutils
import math

# Clear existing mesh objects
bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete(use_global=False)

# Create materials
def create_materials():
    # Black material for the cat
    black_mat = bpy.data.materials.new(name="LightCat_Black")
    black_mat.use_nodes = True
    bsdf = black_mat.node_tree.nodes["Principled BSDF"]
    bsdf.inputs[0].default_value = (0, 0, 0, 1)  # Base Color - Pure black
    bsdf.inputs[7].default_value = 0.8  # Roughness
    
    # Yellow emission material for outline/glow
    yellow_mat = bpy.data.materials.new(name="LightCat_Yellow")
    yellow_mat.use_nodes = True
    bsdf_yellow = yellow_mat.node_tree.nodes["Principled BSDF"]
    bsdf_yellow.inputs[0].default_value = (1, 1, 0, 1)  # Base Color - Yellow
    
    # Add emission
    emission = yellow_mat.node_tree.nodes.new('ShaderNodeEmission')
    emission.inputs[0].default_value = (1, 1, 0, 1)  # Yellow emission
    emission.inputs[1].default_value = 2.0  # Strength
    
    # Mix shader for glow effect
    mix = yellow_mat.node_tree.nodes.new('ShaderNodeMixShader')
    mix.inputs[0].default_value = 0.5
    
    # Connect nodes
    yellow_mat.node_tree.links.new(bsdf_yellow.outputs[0], mix.inputs[1])
    yellow_mat.node_tree.links.new(emission.outputs[0], mix.inputs[2])
    yellow_mat.node_tree.links.new(mix.outputs[0], yellow_mat.node_tree.nodes["Material Output"].inputs[0])
    
    return black_mat, yellow_mat

# Create the cat model
def create_lightcat():
    black_mat, yellow_mat = create_materials()
    
    # Create main body (capsule-like shape)
    bpy.ops.mesh.primitive_cylinder_add(vertices=32, radius=1.2, depth=3, location=(0, 0, 0))
    body = bpy.context.active_object
    body.name = "LightCat_Body"
    
    # Apply subdivision surface for smoother shape
    subdiv = body.modifiers.new("Subdivision", 'SUBSURF')
    subdiv.levels = 2
    subdiv.render_levels = 2
    
    # Scale to make it more cat-like
    body.scale = (1, 0.8, 1.2)
    
    # Apply material
    body.data.materials.append(black_mat)
    
    # Create head (sphere)
    bpy.ops.mesh.primitive_uv_sphere_add(segments=32, ring_count=16, radius=1, location=(0, 0, 2.2))
    head = bpy.context.active_object
    head.name = "LightCat_Head"
    head.scale = (1.1, 0.9, 1)
    head.data.materials.append(black_mat)
    
    # Create ears
    # Left ear
    bpy.ops.mesh.primitive_cone_add(vertices=4, radius1=0.5, depth=0.8, location=(-0.6, -0.2, 3))
    left_ear = bpy.context.active_object
    left_ear.name = "LightCat_LeftEar"
    left_ear.rotation_euler = (0.3, 0, -0.2)
    left_ear.data.materials.append(black_mat)
    
    # Right ear
    bpy.ops.mesh.primitive_cone_add(vertices=4, radius1=0.5, depth=0.8, location=(0.6, -0.2, 3))
    right_ear = bpy.context.active_object
    right_ear.name = "LightCat_RightEar"
    right_ear.rotation_euler = (0.3, 0, 0.2)
    right_ear.data.materials.append(black_mat)
    
    # Create arms (spread wide like in the logo)
    # Left arm
    bpy.ops.mesh.primitive_cylinder_add(vertices=16, radius=0.3, depth=2, location=(-1.8, 0, 0.5))
    left_arm = bpy.context.active_object
    left_arm.name = "LightCat_LeftArm"
    left_arm.rotation_euler = (0, 1.2, 0.5)
    left_arm.data.materials.append(black_mat)
    
    # Right arm
    bpy.ops.mesh.primitive_cylinder_add(vertices=16, radius=0.3, depth=2, location=(1.8, 0, 0.5))
    right_arm = bpy.context.active_object
    right_arm.name = "LightCat_RightArm"
    right_arm.rotation_euler = (0, -1.2, -0.5)
    right_arm.data.materials.append(black_mat)
    
    # Create legs
    # Left leg
    bpy.ops.mesh.primitive_cylinder_add(vertices=16, radius=0.4, depth=2.5, location=(-0.6, 0, -2.5))
    left_leg = bpy.context.active_object
    left_leg.name = "LightCat_LeftLeg"
    left_leg.data.materials.append(black_mat)
    
    # Right leg
    bpy.ops.mesh.primitive_cylinder_add(vertices=16, radius=0.4, depth=2.5, location=(0.6, 0, -2.5))
    right_leg = bpy.context.active_object
    right_leg.name = "LightCat_RightLeg"
    right_leg.data.materials.append(black_mat)
    
    # Create eyes (half-closed, yellow)
    # Left eye
    bpy.ops.mesh.primitive_cube_add(size=0.4, location=(-0.35, 0.8, 2.2))
    left_eye = bpy.context.active_object
    left_eye.name = "LightCat_LeftEye"
    left_eye.scale = (1, 0.1, 0.3)
    left_eye.data.materials.append(yellow_mat)
    
    # Right eye
    bpy.ops.mesh.primitive_cube_add(size=0.4, location=(0.35, 0.8, 2.2))
    right_eye = bpy.context.active_object
    right_eye.name = "LightCat_RightEye"
    right_eye.scale = (1, 0.1, 0.3)
    right_eye.data.materials.append(yellow_mat)
    
    # Select all cat parts
    cat_parts = [body, head, left_ear, right_ear, left_arm, right_arm, left_leg, right_leg, left_eye, right_eye]
    
    # Join all parts into one object
    bpy.ops.object.select_all(action='DESELECT')
    for part in cat_parts:
        part.select_set(True)
    bpy.context.view_layer.objects.active = body
    bpy.ops.object.join()
    
    # Rename final object
    body.name = "LightCat"
    
    # Create outline effect using solidify modifier
    outline = body.modifiers.new("Outline", 'SOLIDIFY')
    outline.thickness = 0.1
    outline.offset = 1
    outline.use_flip_normals = True
    outline.material_offset = 1
    
    # Add yellow material for outline
    body.data.materials.append(yellow_mat)
    
    # Add point light for glow effect
    bpy.ops.object.light_add(type='POINT', location=(0, 0, 1))
    light = bpy.context.active_object
    light.name = "LightCat_Glow"
    light.data.energy = 50
    light.data.color = (1, 1, 0)  # Yellow
    
    # Parent light to cat
    light.parent = body
    
    print("LightCat 3D model created successfully!")
    
    return body

# Create the model
lightcat = create_lightcat()

# Set up the scene
# Set viewport shading to solid or material preview
for area in bpy.context.screen.areas:
    if area.type == 'VIEW_3D':
        for space in area.spaces:
            if space.type == 'VIEW_3D':
                space.shading.type = 'MATERIAL'

# Frame the object in view
bpy.ops.view3d.view_all()

print("LightCat model ready! You can now export it as GLTF/GLB for use in Three.js")
print("File > Export > glTF 2.0")