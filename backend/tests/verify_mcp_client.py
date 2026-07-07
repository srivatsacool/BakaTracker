import asyncio
import os
import sys

# Add current directory and parent directory to path
current_dir = os.path.dirname(os.path.abspath(__file__))
parent_dir = os.path.dirname(current_dir)
if current_dir not in sys.path:
    sys.path.append(current_dir)
if parent_dir not in sys.path:
    sys.path.append(parent_dir)

from mcp import ClientSession, StdioServerParameters
from mcp.client.stdio import stdio_client

async def run_verification():
    print("Starting FastMCP local verification client...")
    
    python_exe = sys.executable
    server_script = os.path.join(parent_dir, "server.py")
    
    print(f"Python Executable: {python_exe}")
    print(f"Server Script: {server_script}")
    
    server_params = StdioServerParameters(
        command=python_exe,
        args=[server_script],
        env=os.environ.copy()
    )
    
    try:
        async with stdio_client(server_params) as (read, write):
            async with ClientSession(read, write) as session:
                # 1. Initialize
                print("\n[Step 1/8] Initializing session...")
                await session.initialize()
                print("Session initialized successfully.")
                
                # 2. List tools
                print("\n[Step 2/8] Fetching tools list...")
                tools_response = await session.list_tools()
                tools = tools_response.tools
                print(f"Received {len(tools)} tools.")
                for t in tools[:3]:
                    print(f"  - {t.name}: {t.description}")
                if len(tools) > 3:
                    print("  ... and others.")
                
                # 3. Call tool
                print("\n[Step 3/8] Calling a safe tool 'get_random_quote'...")
                tool_result = await session.call_tool("get_random_quote")
                print(f"Tool Call Response: {tool_result.content}")
                
                # 4. List resources
                print("\n[Step-4/8] Fetching resources list...")
                resources_response = await session.list_resources()
                resources = resources_response.resources
                print(f"Received {len(resources)} resources.")
                for r in resources:
                    print(f"  - {r.uri}: {r.name}")
                    
                # 5. Read resource
                print("\n[Step 5/8] Reading resource 'bakatracker://character'...")
                resource_result = await session.read_resource("bakatracker://character")
                print("Resource Read Response:")
                print(resource_result.contents[0].text if resource_result.contents else "Empty resource contents")
                
                # 6. List prompts
                print("\n[Step 6/8] Fetching prompts list...")
                prompts_response = await session.list_prompts()
                prompts = prompts_response.prompts
                print(f"Received {len(prompts)} prompts.")
                for p in prompts:
                    print(f"  - {p.name}: {p.description}")
                    
                # 7. Get prompt
                print("\n[Step 7/8] Getting prompt 'daily_review'...")
                prompt_result = await session.get_prompt("daily_review")
                print("Prompt Retrieval Response:")
                print(prompt_result.messages[0].content.text if prompt_result.messages else "Empty prompt messages")
                
                print("\n[Step 8/8] Local MCP Verification complete! SUCCESS!")
                
    except Exception as e:
        print(f"\nVerification failed with error: {str(e)}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

if __name__ == "__main__":
    asyncio.run(run_verification())
