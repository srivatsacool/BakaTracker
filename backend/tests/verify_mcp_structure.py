import os
import sys

# Add current directory and parent directory to path
current_dir = os.path.dirname(os.path.abspath(__file__))
parent_dir = os.path.dirname(current_dir)
if current_dir not in sys.path:
    sys.path.append(current_dir)
if parent_dir not in sys.path:
    sys.path.append(parent_dir)

try:
    from server import mcp
    import importlib.metadata
    
    mcp_ver = importlib.metadata.version('mcp')
    print(f"FastMCP Version: {mcp_ver}")
    print("Transport enabled in main.py: SSE (mounted on /mcp)")
    print("Server run() entrypoint: mcp.run() (runs stdio by default when invoked as script)")
    
    print("\n=== REGISTERED TOOLS ===")
    tools_source = mcp._tool_manager._tools
    # Handle both dict and list
    if hasattr(tools_source, 'values'):
        tools = list(tools_source.values())
    elif isinstance(tools_source, list):
        tools = tools_source
    else:
        # It's a dict or something else, let's convert
        tools = [tools_source[k] for k in tools_source]
        
    print(f"Total Tools: {len(tools)}")
    for tool in tools:
        name = getattr(tool, 'name', 'unknown')
        fn_name = getattr(tool.fn, '__name__', 'unknown') if hasattr(tool, 'fn') else 'unknown'
        desc = getattr(tool, 'description', 'No description')
        desc_line = desc.splitlines()[0] if desc else 'No description'
        print(f"- Tool Name: {name}")
        print(f"  Function: {fn_name}")
        print(f"  Description: {desc_line}")
        
    print("\n=== REGISTERED RESOURCES ===")
    res_source = mcp._resource_manager._resources
    if hasattr(res_source, 'values'):
        resources = list(res_source.values())
    else:
        resources = list(res_source)
        
    print(f"Total Resources: {len(resources)}")
    for resource in resources:
        if isinstance(resource, str):
            # Key only
            print(f"- Resource Name/URI: {resource}")
        else:
            uri = getattr(resource, 'uri', 'unknown')
            fn_name = getattr(resource.fn, '__name__', 'unknown') if hasattr(resource, 'fn') else 'unknown'
            desc = getattr(resource, 'description', 'No description')
            desc_line = desc.splitlines()[0] if desc else 'No description'
            print(f"- Resource URI: {uri}")
            print(f"  Function: {fn_name}")
            print(f"  Description: {desc_line}")
        
    print("\n=== REGISTERED PROMPTS ===")
    prompt_source = mcp._prompt_manager._prompts
    if hasattr(prompt_source, 'values'):
        prompts = list(prompt_source.values())
    else:
        prompts = list(prompt_source)
        
    print(f"Total Prompts: {len(prompts)}")
    for prompt in prompts:
        if isinstance(prompt, str):
            print(f"- Prompt Name: {prompt}")
        else:
            name = getattr(prompt, 'name', 'unknown')
            fn_name = getattr(prompt.fn, '__name__', 'unknown') if hasattr(prompt, 'fn') else 'unknown'
            desc = getattr(prompt, 'description', 'No description')
            desc_line = desc.splitlines()[0] if desc else 'No description'
            print(f"- Prompt Name: {name}")
            print(f"  Function: {fn_name}")
            print(f"  Description: {desc_line}")
        
except Exception as e:
    print(f"Audit failed with error: {str(e)}")
    import traceback
    traceback.print_exc()
    sys.exit(1)
