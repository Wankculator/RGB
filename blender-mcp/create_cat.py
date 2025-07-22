"""
Blender Python Script: Create a Cute Cat
This script creates a stylized cat using basic Blender shapes and operations.
"""

import bpy
import bmesh
from mathutils import Vector
import math

def clear_scene():
    """Clear the default scene"""
    bpy.ops.object.select_all(action='SELECT')
    bpy.ops.object.delete(use_global=False)

def create_cat():
    """Create a cute cat using basic shapes"""
    
    # Clear the scene first
    clear_scene()
    
    # Create cat body (main torso)
    bpy.ops.mesh.primitive_uv_sphere_add(radius=1.2, location=(0, 0, 0))
    body = bpy.context.active_object
    body.name = "Cat_Body"
    
    # Scale body to be more oval
    body.scale = (1.0, 1.5, 0.8)
    bpy.ops.object.transform_apply(scale=True)
    
    # Create cat head
    bpy.ops.mesh.primitive_uv_sphere_add(radius=0.8, location=(0, 1.8, 0.3))
    head = bpy.context.active_object
    head.name = "Cat_Head"
    
    # Create ears
    # Left ear
    bpy.ops.mesh.primitive_cone_add(radius1=0.3, depth=0.6, location=(-0.4, 2.2, 0.9))
    left_ear = bpy.context.active_object
    left_ear.name = "Cat_Ear_Left"
    left_ear.rotation_euler = (0.3, 0, -0.3)
    
    # Right ear
    bpy.ops.mesh.primitive_cone_add(radius1=0.3, depth=0.6, location=(0.4, 2.2, 0.9))
    right_ear = bpy.context.active_object
    right_ear.name = "Cat_Ear_Right"
    right_ear.rotation_euler = (0.3, 0, 0.3)
    
    # Create legs
    leg_positions = [
        (-0.6, 0.8, -1.2),   # Front left
        (0.6, 0.8, -1.2),    # Front right
        (-0.6, -0.8, -1.2),  # Back left
        (0.6, -0.8, -1.2)    # Back right
    ]
    
    for i, pos in enumerate(leg_positions):
        bpy.ops.mesh.primitive_cylinder_add(radius=0.2, depth=0.8, location=pos)
        leg = bpy.context.active_object
        leg.name = f"Cat_Leg_{i+1}"
    
    # Create tail
    bpy.ops.mesh.primitive_cylinder_add(radius=0.15, depth=2.0, location=(0, -2.2, 0.5))
    tail = bpy.context.active_object
    tail.name = "Cat_Tail"
    tail.rotation_euler = (1.2, 0, 0)
    
    # Create eyes
    # Left eye
    bpy.ops.mesh.primitive_uv_sphere_add(radius=0.15, location=(-0.25, 2.3, 0.4))
    left_eye = bpy.context.active_object
    left_eye.name = "Cat_Eye_Left"
    
    # Right eye
    bpy.ops.mesh.primitive_uv_sphere_add(radius=0.15, location=(0.25, 2.3, 0.4))
    right_eye = bpy.context.active_object
    right_eye.name = "Cat_Eye_Right"
    
    # Create nose
    bpy.ops.mesh.primitive_uv_sphere_add(radius=0.08, location=(0, 2.4, 0.1))
    nose = bpy.context.active_object
    nose.name = "Cat_Nose"
    
    # Create whiskers (using curves)
    create_whiskers()
    
    # Apply materials
    apply_cat_materials()
    
    # Join all body parts
    join_cat_parts()
    
    print("🐱 Cute cat created successfully!")

def create_whiskers():
    """Create whiskers using curves"""
    whisker_positions = [
        ((-0.6, 2.35, 0.1), (0.3, 0, 0)),   # Left whiskers
        ((0.6, 2.35, 0.1), (-0.3, 0, 0)),   # Right whiskers
        ((-0.4, 2.4, 0.05), (0.2, 0, 0)),
        ((0.4, 2.4, 0.05), (-0.2, 0, 0))
    ]
    
    for i, (start_pos, direction) in enumerate(whisker_positions):
        # Create curve
        bpy.ops.curve.primitive_nurbs_path_add(location=start_pos)
        whisker = bpy.context.active_object
        whisker.name = f"Cat_Whisker_{i+1}"
        
        # Make it thin
        whisker.data.bevel_depth = 0.02
        whisker.data.bevel_resolution = 2

def apply_cat_materials():
    """Apply materials to make the cat look cute"""
    
    # Create main cat material (orange/tabby)
    cat_material = bpy.data.materials.new(name="Cat_Fur")
    cat_material.use_nodes = True
    cat_material.node_tree.clear()
    
    # Add nodes
    bsdf = cat_material.node_tree.nodes.new(type='ShaderNodeBsdfPrincipled')
    output = cat_material.node_tree.nodes.new(type='ShaderNodeOutputMaterial')
    
    # Set orange color
    bsdf.inputs['Base Color'].default_value = (0.8, 0.4, 0.1, 1.0)  # Orange
    bsdf.inputs['Roughness'].default_value = 0.8
    
    # Connect nodes
    cat_material.node_tree.links.new(bsdf.outputs['BSDF'], output.inputs['Surface'])
    
    # Create eye material (green)
    eye_material = bpy.data.materials.new(name="Cat_Eyes")
    eye_material.use_nodes = True
    eye_material.node_tree.clear()
    
    bsdf_eye = eye_material.node_tree.nodes.new(type='ShaderNodeBsdfPrincipled')
    output_eye = eye_material.node_tree.nodes.new(type='ShaderNodeOutputMaterial')
    
    bsdf_eye.inputs['Base Color'].default_value = (0.1, 0.8, 0.3, 1.0)  # Green
    bsdf_eye.inputs['Metallic'].default_value = 0.0
    bsdf_eye.inputs['Roughness'].default_value = 0.1
    
    eye_material.node_tree.links.new(bsdf_eye.outputs['BSDF'], output_eye.inputs['Surface'])
    
    # Create nose material (pink)
    nose_material = bpy.data.materials.new(name="Cat_Nose")
    nose_material.use_nodes = True
    nose_material.node_tree.clear()
    
    bsdf_nose = nose_material.node_tree.nodes.new(type='ShaderNodeBsdfPrincipled')
    output_nose = nose_material.node_tree.nodes.new(type='ShaderNodeOutputMaterial')
    
    bsdf_nose.inputs['Base Color'].default_value = (0.9, 0.4, 0.6, 1.0)  # Pink
    bsdf_nose.inputs['Roughness'].default_value = 0.3
    
    nose_material.node_tree.links.new(bsdf_nose.outputs['BSDF'], output_nose.inputs['Surface'])
    
    # Apply materials to objects
    for obj in bpy.data.objects:
        if "Cat_Eye" in obj.name:
            obj.data.materials.append(eye_material)
        elif "Cat_Nose" in obj.name:
            obj.data.materials.append(nose_material)
        elif "Cat_" in obj.name and "Whisker" not in obj.name:
            obj.data.materials.append(cat_material)

def join_cat_parts():
    """Join all cat parts into one object"""
    # Select all cat objects
    bpy.ops.object.select_all(action='DESELECT')
    
    cat_objects = [obj for obj in bpy.data.objects if "Cat_" in obj.name and "Whisker" not in obj.name]
    
    if cat_objects:
        # Set the first object as active
        bpy.context.view_layer.objects.active = cat_objects[0]
        
        # Select all cat objects
        for obj in cat_objects:
            obj.select_set(True)
        
        # Join them
        bpy.ops.object.join()
        
        # Rename the final object
        bpy.context.active_object.name = "Cute_Cat"

def setup_scene():
    """Set up the scene with good lighting and camera"""
    
    # Add a light
    bpy.ops.object.light_add(type='SUN', location=(5, 5, 10))
    sun = bpy.context.active_object
    sun.data.energy = 3
    
    # Position camera
    bpy.ops.object.camera_add(location=(4, -6, 3))
    camera = bpy.context.active_object
    
    # Point camera at the cat
    constraint = camera.constraints.new(type='TRACK_TO')
    if bpy.data.objects.get("Cute_Cat"):
        constraint.target = bpy.data.objects["Cute_Cat"]
    
    # Set camera as active
    bpy.context.scene.camera = camera

# Main execution
if __name__ == "__main__":
    print("🎨 Creating an adorable cat in Blender...")
    create_cat()
    setup_scene()
    print("✅ Cat creation complete! Your cute cat is ready! 🐱")
