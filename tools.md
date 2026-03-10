Welcome to fish, the friendly interactive shell
Type help for instructions on how to use fish
grizzmed@Roberts-MacBook-Air-4 ~> docker mcp gateway run
- Reading configuration...
  - Reading registry from registry.yaml
  - Reading catalog from [docker-mcp.yaml]
  - Reading config from config.yaml
  - Reading tools from tools.yaml
- Configuration read in 588.22275ms
- Using images:
  - alpine/curl@sha256:b80d9b3536b7ae39fb7c27706d28d225257c0fc1df1a7526acc98fb0ef75917f
  - docker:cli@sha256:067c301efe497cd5d174d468b7b3422a485ae4aca8f7ec1ffd4655c9fa383af2
  - ghcr.io/github/github-mcp-server@sha256:2763823c63bcca718ce53850a1d7fcf2f501ec84028394f1b63ce7e9f4f9be28
  - mcp/arxiv-mcp-server@sha256:6dc6bba6dfed97f4ad6eb8d23a5c98ef5b7fa6184937d54b2d675801cd9dd29e
  - mcp/context7@sha256:1174e6a29634a83b2be93ac1fefabf63265f498c02c72201fe3464e687dd8836
  - mcp/desktop-commander@sha256:b1bdd77ea94c244ba38cfae637b6f20a92dd90b0c4aee955f182017f75ff2652
  - mcp/dockerhub@sha256:693a03d6387531c4e737ef72a0b8f2f0e9eada60ab94e52ee0a481a233cdda3d
  - mcp/fetch@sha256:302c629381f2a7e9599bffe3ee742e519a60c85ab777a45f296d4dbd02e13fa0
  - mcp/filesystem@sha256:35fcf0217ca0d5bf7b0a5bd68fb3b89e08174676c0e0b4f431604512cf7b3f67
  - mcp/git@sha256:ad6af958e79466a14b895891e772fdda28fdc12c06fff4a70637b66773303a2c
  - mcp/github-chat@sha256:c9b12a1664919c8dbae726ef3f36761ee42b1a729ae17b820f73e6c59063047b
  - mcp/hackernews-mcp@sha256:2e5c5cc89490848e1b5c0dc677f0dd5076dd09984be699e230cad387fb5f582f
  - mcp/hyperbrowser@sha256:11ed80138c334c419249c79e5f5acda3f4e7052c04f62f54548f00a3b9815140
  - mcp/mapbox-devkit@sha256:7ecb002c45ffeb9c9df5ae23d08e03d0cbb8fb1504b87d95b7bfa869fcaf2b24
  - mcp/mapbox@sha256:3dd0ef06640c08fda02d3d6fe5fac567bf68a71f03ec234f18f620872b88868c
  - mcp/markdownify@sha256:fdd1de7ee60dcbe625222e01fefc12fc9a57fb0121866af047cb7457850e0594
  - mcp/memory@sha256:db0c2db07a44b6797eba7a832b1bda142ffc899588aae82c92780cbb2252407f
  - mcp/next-devtools-mcp@sha256:3064e349c266ddae35bf49a0d1d9eb8dd2ec699fb8dddbdab61650e522c9b322
  - mcp/node-code-sandbox@sha256:e8cbb5c3ae86d2aeb3974065ff9120d97d52e61e13b89fc03a704f4ebba7f98c
  - mcp/npm-sentinel@sha256:d8e4bbc7dd5c163fb8abab3f36062a36a02bfd200cae199a9e2392bf4c9198ab
  - mcp/playwright@sha256:7e702de2174b3681e7e6dc399a2e2b3270a6fde3bedc20408b5da73febd73302
  - mcp/time@sha256:9c46a918633fb474bf8035e3ee90ebac6bcf2b18ccb00679ac4c179cba0ebfcf
  - mcp/youtube-transcript@sha256:5ad25f9f0879177ed7f0f85f9ede9e882b325f6e76f6d3901a49f49a430c6796
> Images pulled in 2.582547875s
- Those servers are enabled: arxiv-mcp-server, cloudflare-docs, context7, curl, desktop-commander, docker, dockerhub, fetch, filesystem, git, github-chat, github-official, hugging-face, hyperbrowser, mapbox, mapbox-devkit, markdownify, mcp-hackernews, memory, next-devtools-mcp, node-code-sandbox, npm-sentinel, playwright, time, youtube_transcript
- Listing MCP tools...
  - Running mcp/context7 with [run --rm -i --init --security-opt no-new-privileges --cpus 1 --memory 2Gb --pull never -l docker-mcp=true -l docker-mcp-tool-type=mcp -l docker-mcp-name=context7 -l docker-mcp-transport=stdio -e MCP_TRANSPORT]
  - Running mcp/fetch with [run --rm -i --init --security-opt no-new-privileges --cpus 1 --memory 2Gb --pull never -l docker-mcp=true -l docker-mcp-tool-type=mcp -l docker-mcp-name=fetch -l docker-mcp-transport=stdio]
  - Running mcp/git with [run --rm -i --init --security-opt no-new-privileges --cpus 1 --memory 2Gb --pull never -l docker-mcp=true -l docker-mcp-tool-type=mcp -l docker-mcp-name=git -l docker-mcp-transport=stdio]
  - Running mcp/desktop-commander with [run --rm -i --init --security-opt no-new-privileges --cpus 1 --memory 2Gb --pull never -l docker-mcp=true -l docker-mcp-tool-type=mcp -l docker-mcp-name=desktop-commander -l docker-mcp-transport=stdio -v /Users/grizzmed:/Users/grizzmed]
  - Running mcp/arxiv-mcp-server with [run --rm -i --init --security-opt no-new-privileges --cpus 1 --memory 2Gb --pull never -l docker-mcp=true -l docker-mcp-tool-type=mcp -l docker-mcp-name=arxiv-mcp-server -l docker-mcp-transport=stdio -e ARXIV_STORAGE_PATH -v ~/grizzmed/research_papers:/app/papers]
  - Running mcp/dockerhub with [run --rm -i --init --security-opt no-new-privileges --cpus 1 --memory 2Gb --pull never -l docker-mcp=true -l docker-mcp-tool-type=mcp -l docker-mcp-name=dockerhub -l docker-mcp-transport=stdio -e HUB_PAT_TOKEN] and command [--transport=stdio --username=oldmangrizzz]
  - Running mcp/filesystem with [run --rm -i --init --security-opt no-new-privileges --cpus 1 --memory 2Gb --pull never -l docker-mcp=true -l docker-mcp-tool-type=mcp -l docker-mcp-name=filesystem -l docker-mcp-transport=stdio --network none -v /Users/grizzmed:/Users/grizzmed] and command [/Users/grizzmed]
  > Can't start arxiv-mcp-server: failed to connect: calling "initialize": EOF
  - Running mcp/github-chat with [run --rm -i --init --security-opt no-new-privileges --cpus 1 --memory 2Gb --pull never -l docker-mcp=true -l docker-mcp-tool-type=mcp -l docker-mcp-name=github-chat -l docker-mcp-transport=stdio -e GITHUB_API_KEY]
  > cloudflare-docs: (2 tools) (1 prompts)
  - Running ghcr.io/github/github-mcp-server with [run --rm -i --init --security-opt no-new-privileges --cpus 1 --memory 2Gb --pull never -l docker-mcp=true -l docker-mcp-tool-type=mcp -l docker-mcp-name=github-official -l docker-mcp-transport=stdio -e GITHUB_PERSONAL_ACCESS_TOKEN]
  > github-official: (41 tools) (2 prompts) (5 resourceTemplates)
  > filesystem: (11 tools)
  > context7: (2 tools)
  - Running mcp/hyperbrowser with [run --rm -i --init --security-opt no-new-privileges --cpus 1 --memory 2Gb --pull never -l docker-mcp=true -l docker-mcp-tool-type=mcp -l docker-mcp-name=hyperbrowser -l docker-mcp-transport=stdio -e HYPERBROWSER_API_KEY]
  > hugging-face: (8 tools) (4 prompts)
  - Running mcp/mapbox with [run --rm -i --init --security-opt no-new-privileges --cpus 1 --memory 2Gb --pull never -l docker-mcp=true -l docker-mcp-tool-type=mcp -l docker-mcp-name=mapbox -l docker-mcp-transport=stdio -e MAPBOX_ACCESS_TOKEN]
  - Running mcp/mapbox-devkit with [run --rm -i --init --security-opt no-new-privileges --cpus 1 --memory 2Gb --pull never -l docker-mcp=true -l docker-mcp-tool-type=mcp -l docker-mcp-name=mapbox-devkit -l docker-mcp-transport=stdio -e MAPBOX_ACCESS_TOKEN]
  > git: (12 tools)
  > dockerhub: (13 tools)
  - Running mcp/markdownify with [run --rm -i --init --security-opt no-new-privileges --cpus 1 --memory 2Gb --pull never -l docker-mcp=true -l docker-mcp-tool-type=mcp -l docker-mcp-name=markdownify -l docker-mcp-transport=stdio]
  - Running mcp/hackernews-mcp with [run --rm -i --init --security-opt no-new-privileges --cpus 1 --memory 2Gb --pull never -l docker-mcp=true -l docker-mcp-tool-type=mcp -l docker-mcp-name=mcp-hackernews -l docker-mcp-transport=stdio]
  > hyperbrowser: (10 tools) (54 resources)
  > fetch: (1 tools) (1 prompts)
  - Running mcp/memory with [run --rm -i --init --security-opt no-new-privileges --cpus 1 --memory 2Gb --pull never -l docker-mcp=true -l docker-mcp-tool-type=mcp -l docker-mcp-name=memory -l docker-mcp-transport=stdio -v claude-memory:/app/dist]
  - Running mcp/next-devtools-mcp with [run --rm -i --init --security-opt no-new-privileges --cpus 1 --memory 2Gb --pull never -l docker-mcp=true -l docker-mcp-tool-type=mcp -l docker-mcp-name=next-devtools-mcp -l docker-mcp-transport=stdio]
  > github-chat: (2 tools)
  > markdownify: (10 tools)
  > memory: (9 tools)
  > mcp-hackernews: (4 tools)
  - Running mcp/node-code-sandbox with [run --rm -i --init --security-opt no-new-privileges --cpus 1 --memory 2Gb --pull never -l docker-mcp=true -l docker-mcp-tool-type=mcp -l docker-mcp-name=node-code-sandbox -l docker-mcp-transport=stdio]
  - Running mcp/npm-sentinel with [run --rm -i --init --security-opt no-new-privileges --cpus 1 --memory 2Gb --pull never -l docker-mcp=true -l docker-mcp-tool-type=mcp -l docker-mcp-name=npm-sentinel -l docker-mcp-transport=stdio]
  - Running mcp/playwright with [run --rm -i --init --security-opt no-new-privileges --cpus 1 --memory 2Gb --pull never -l docker-mcp=true -l docker-mcp-tool-type=mcp -l docker-mcp-name=playwright -l docker-mcp-transport=stdio]
  - Running mcp/time with [run --rm -i --init --security-opt no-new-privileges --cpus 1 --memory 2Gb --pull never -l docker-mcp=true -l docker-mcp-tool-type=mcp -l docker-mcp-name=time -l docker-mcp-transport=stdio]
  > next-devtools-mcp: (5 tools) (2 prompts) (16 resources)
  - Running mcp/youtube-transcript with [run --rm -i --init --security-opt no-new-privileges --cpus 1 --memory 2Gb --pull never -l docker-mcp=true -l docker-mcp-tool-type=mcp -l docker-mcp-name=youtube_transcript -l docker-mcp-transport=stdio]
  > desktop-commander: (26 tools) (2 resources)
  > npm-sentinel: (19 tools) (2 resources)
  > time: (2 tools)
  > playwright: (22 tools)
  > node-code-sandbox: (7 tools) (1 prompts) (1 resourceTemplates)
  > mapbox-devkit: (23 tools) (7 prompts) (8 resources)
  > mapbox: (19 tools) (4 prompts) (3 resources) (1 resourceTemplates)
  > youtube_transcript: (3 tools)
> 253 tools listed in 48.343730333s
- Adding internal tools (dynamic-tools feature enabled)
  > mcp-find: tool for finding MCP servers in the catalog
  > mcp-add: tool for adding MCP servers to the registry
  > mcp-remove: tool for removing MCP servers from the registry
  > code-mode: write code that calls other MCPs directly
  > mcp-exec: execute tools that exist in the current session
  > mcp-config-set: tool for setting configuration values for MCP servers
  > mcp-discover: prompt for learning about dynamic server management
- Starting OAuth notification monitor
- Starting OAuth provider loops...
- Watching for configuration updates...
> Initialized in 51.579022291s
> Start stdio server
- Connecting to OAuth notification stream at http://localhost/notify/notifications/channel/external-oauth
^C> Stop watching for updates
- Failed to connect to OAuth notifications: Get "http://localhost/notify/notifications/channel/external-oauth": context canceled
context canceled
grizzmed@Roberts-MacBook-Air-4 ~ [1]> docker mcp gateway run
- Reading configuration...
  - Reading registry from registry.yaml
  - Reading catalog from [docker-mcp.yaml]
  - Reading config from config.yaml
  - Reading tools from tools.yaml
- Configuration read in 803.728584ms
- Using images:
  - alpine/curl@sha256:b80d9b3536b7ae39fb7c27706d28d225257c0fc1df1a7526acc98fb0ef75917f
  - docker:cli@sha256:067c301efe497cd5d174d468b7b3422a485ae4aca8f7ec1ffd4655c9fa383af2
  - ghcr.io/github/github-mcp-server@sha256:2763823c63bcca718ce53850a1d7fcf2f501ec84028394f1b63ce7e9f4f9be28
  - mcp/arxiv-mcp-server@sha256:6dc6bba6dfed97f4ad6eb8d23a5c98ef5b7fa6184937d54b2d675801cd9dd29e
  - mcp/context7@sha256:1174e6a29634a83b2be93ac1fefabf63265f498c02c72201fe3464e687dd8836
  - mcp/desktop-commander@sha256:b1bdd77ea94c244ba38cfae637b6f20a92dd90b0c4aee955f182017f75ff2652
  - mcp/dockerhub@sha256:693a03d6387531c4e737ef72a0b8f2f0e9eada60ab94e52ee0a481a233cdda3d
  - mcp/fetch@sha256:302c629381f2a7e9599bffe3ee742e519a60c85ab777a45f296d4dbd02e13fa0
  - mcp/filesystem@sha256:35fcf0217ca0d5bf7b0a5bd68fb3b89e08174676c0e0b4f431604512cf7b3f67
  - mcp/git@sha256:ad6af958e79466a14b895891e772fdda28fdc12c06fff4a70637b66773303a2c
  - mcp/github-chat@sha256:c9b12a1664919c8dbae726ef3f36761ee42b1a729ae17b820f73e6c59063047b
  - mcp/hackernews-mcp@sha256:2e5c5cc89490848e1b5c0dc677f0dd5076dd09984be699e230cad387fb5f582f
  - mcp/hyperbrowser@sha256:11ed80138c334c419249c79e5f5acda3f4e7052c04f62f54548f00a3b9815140
  - mcp/mapbox-devkit@sha256:7ecb002c45ffeb9c9df5ae23d08e03d0cbb8fb1504b87d95b7bfa869fcaf2b24
  - mcp/mapbox@sha256:3dd0ef06640c08fda02d3d6fe5fac567bf68a71f03ec234f18f620872b88868c
  - mcp/markdownify@sha256:fdd1de7ee60dcbe625222e01fefc12fc9a57fb0121866af047cb7457850e0594
  - mcp/memory@sha256:db0c2db07a44b6797eba7a832b1bda142ffc899588aae82c92780cbb2252407f
  - mcp/next-devtools-mcp@sha256:3064e349c266ddae35bf49a0d1d9eb8dd2ec699fb8dddbdab61650e522c9b322
  - mcp/node-code-sandbox@sha256:e8cbb5c3ae86d2aeb3974065ff9120d97d52e61e13b89fc03a704f4ebba7f98c
  - mcp/npm-sentinel@sha256:d8e4bbc7dd5c163fb8abab3f36062a36a02bfd200cae199a9e2392bf4c9198ab
  - mcp/playwright@sha256:7e702de2174b3681e7e6dc399a2e2b3270a6fde3bedc20408b5da73febd73302
  - mcp/time@sha256:9c46a918633fb474bf8035e3ee90ebac6bcf2b18ccb00679ac4c179cba0ebfcf
  - mcp/youtube-transcript@sha256:5ad25f9f0879177ed7f0f85f9ede9e882b325f6e76f6d3901a49f49a430c6796
> Images pulled in 1.918595292s
- Those servers are enabled: arxiv-mcp-server, cloudflare-docs, context7, curl, desktop-commander, docker, dockerhub, fetch, filesystem, git, github-chat, github-official, hugging-face, hyperbrowser, mapbox, mapbox-devkit, markdownify, mcp-hackernews, memory, next-devtools-mcp, node-code-sandbox, npm-sentinel, playwright, time, youtube_transcript
- Listing MCP tools...
  - Running mcp/context7 with [run --rm -i --init --security-opt no-new-privileges --cpus 1 --memory 2Gb --pull never -l docker-mcp=true -l docker-mcp-tool-type=mcp -l docker-mcp-name=context7 -l docker-mcp-transport=stdio -e MCP_TRANSPORT]
  - Running mcp/arxiv-mcp-server with [run --rm -i --init --security-opt no-new-privileges --cpus 1 --memory 2Gb --pull never -l docker-mcp=true -l docker-mcp-tool-type=mcp -l docker-mcp-name=arxiv-mcp-server -l docker-mcp-transport=stdio -e ARXIV_STORAGE_PATH -v ~/grizzmed/research_papers:/app/papers]
  - Running mcp/git with [run --rm -i --init --security-opt no-new-privileges --cpus 1 --memory 2Gb --pull never -l docker-mcp=true -l docker-mcp-tool-type=mcp -l docker-mcp-name=git -l docker-mcp-transport=stdio]
  - Running mcp/fetch with [run --rm -i --init --security-opt no-new-privileges --cpus 1 --memory 2Gb --pull never -l docker-mcp=true -l docker-mcp-tool-type=mcp -l docker-mcp-name=fetch -l docker-mcp-transport=stdio]
  - Running mcp/filesystem with [run --rm -i --init --security-opt no-new-privileges --cpus 1 --memory 2Gb --pull never -l docker-mcp=true -l docker-mcp-tool-type=mcp -l docker-mcp-name=filesystem -l docker-mcp-transport=stdio --network none -v /Users/grizzmed:/Users/grizzmed] and command [/Users/grizzmed]
  - Running mcp/desktop-commander with [run --rm -i --init --security-opt no-new-privileges --cpus 1 --memory 2Gb --pull never -l docker-mcp=true -l docker-mcp-tool-type=mcp -l docker-mcp-name=desktop-commander -l docker-mcp-transport=stdio -v /Users/grizzmed:/Users/grizzmed]
  - Running mcp/dockerhub with [run --rm -i --init --security-opt no-new-privileges --cpus 1 --memory 2Gb --pull never -l docker-mcp=true -l docker-mcp-tool-type=mcp -l docker-mcp-name=dockerhub -l docker-mcp-transport=stdio -e HUB_PAT_TOKEN] and command [--transport=stdio --username=oldmangrizzz]
  > cloudflare-docs: (2 tools) (1 prompts)
  - Running mcp/github-chat with [run --rm -i --init --security-opt no-new-privileges --cpus 1 --memory 2Gb --pull never -l docker-mcp=true -l docker-mcp-tool-type=mcp -l docker-mcp-name=github-chat -l docker-mcp-transport=stdio -e GITHUB_API_KEY]
  > Can't start arxiv-mcp-server: failed to connect: calling "initialize": EOF
  - Running ghcr.io/github/github-mcp-server with [run --rm -i --init --security-opt no-new-privileges --cpus 1 --memory 2Gb --pull never -l docker-mcp=true -l docker-mcp-tool-type=mcp -l docker-mcp-name=github-official -l docker-mcp-transport=stdio -e GITHUB_PERSONAL_ACCESS_TOKEN]
  > filesystem: (11 tools)
  > hugging-face: (8 tools) (4 prompts)
  - Running mcp/hyperbrowser with [run --rm -i --init --security-opt no-new-privileges --cpus 1 --memory 2Gb --pull never -l docker-mcp=true -l docker-mcp-tool-type=mcp -l docker-mcp-name=hyperbrowser -l docker-mcp-transport=stdio -e HYPERBROWSER_API_KEY]
  > context7: (2 tools)
  > github-official: (41 tools) (2 prompts) (5 resourceTemplates)
  - Running mcp/mapbox with [run --rm -i --init --security-opt no-new-privileges --cpus 1 --memory 2Gb --pull never -l docker-mcp=true -l docker-mcp-tool-type=mcp -l docker-mcp-name=mapbox -l docker-mcp-transport=stdio -e MAPBOX_ACCESS_TOKEN]
  - Running mcp/mapbox-devkit with [run --rm -i --init --security-opt no-new-privileges --cpus 1 --memory 2Gb --pull never -l docker-mcp=true -l docker-mcp-tool-type=mcp -l docker-mcp-name=mapbox-devkit -l docker-mcp-transport=stdio -e MAPBOX_ACCESS_TOKEN]
  > dockerhub: (13 tools)
  > git: (12 tools)
  > hyperbrowser: (10 tools) (54 resources)
  - Running mcp/markdownify with [run --rm -i --init --security-opt no-new-privileges --cpus 1 --memory 2Gb --pull never -l docker-mcp=true -l docker-mcp-tool-type=mcp -l docker-mcp-name=markdownify -l docker-mcp-transport=stdio]
  - Running mcp/hackernews-mcp with [run --rm -i --init --security-opt no-new-privileges --cpus 1 --memory 2Gb --pull never -l docker-mcp=true -l docker-mcp-tool-type=mcp -l docker-mcp-name=mcp-hackernews -l docker-mcp-transport=stdio]
  - Running mcp/memory with [run --rm -i --init --security-opt no-new-privileges --cpus 1 --memory 2Gb --pull never -l docker-mcp=true -l docker-mcp-tool-type=mcp -l docker-mcp-name=memory -l docker-mcp-transport=stdio -v claude-memory:/app/dist]
  > fetch: (1 tools) (1 prompts)
  > github-chat: (2 tools)
  - Running mcp/next-devtools-mcp with [run --rm -i --init --security-opt no-new-privileges --cpus 1 --memory 2Gb --pull never -l docker-mcp=true -l docker-mcp-tool-type=mcp -l docker-mcp-name=next-devtools-mcp -l docker-mcp-transport=stdio]
  > memory: (9 tools)
  - Running mcp/node-code-sandbox with [run --rm -i --init --security-opt no-new-privileges --cpus 1 --memory 2Gb --pull never -l docker-mcp=true -l docker-mcp-tool-type=mcp -l docker-mcp-name=node-code-sandbox -l docker-mcp-transport=stdio]
  - Running mcp/npm-sentinel with [run --rm -i --init --security-opt no-new-privileges --cpus 1 --memory 2Gb --pull never -l docker-mcp=true -l docker-mcp-tool-type=mcp -l docker-mcp-name=npm-sentinel -l docker-mcp-transport=stdio]
  > mcp-hackernews: (4 tools)
  > markdownify: (10 tools)
  - Running mcp/playwright with [run --rm -i --init --security-opt no-new-privileges --cpus 1 --memory 2Gb --pull never -l docker-mcp=true -l docker-mcp-tool-type=mcp -l docker-mcp-name=playwright -l docker-mcp-transport=stdio]
  - Running mcp/time with [run --rm -i --init --security-opt no-new-privileges --cpus 1 --memory 2Gb --pull never -l docker-mcp=true -l docker-mcp-tool-type=mcp -l docker-mcp-name=time -l docker-mcp-transport=stdio]
  > next-devtools-mcp: (5 tools) (2 prompts) (16 resources)
  > desktop-commander: (26 tools) (2 resources)
  > npm-sentinel: (19 tools) (2 resources)
  - Running mcp/youtube-transcript with [run --rm -i --init --security-opt no-new-privileges --cpus 1 --memory 2Gb --pull never -l docker-mcp=true -l docker-mcp-tool-type=mcp -l docker-mcp-name=youtube_transcript -l docker-mcp-transport=stdio]
  > mapbox-devkit: (23 tools) (7 prompts) (8 resources)
  > time: (2 tools)
  > mapbox: (19 tools) (4 prompts) (3 resources) (1 resourceTemplates)
  > node-code-sandbox: (7 tools) (1 prompts) (1 resourceTemplates)
  > playwright: (22 tools)
  > youtube_transcript: (3 tools)
> 253 tools listed in 2m4.538201166s
- Adding internal tools (dynamic-tools feature enabled)
  > mcp-find: tool for finding MCP servers in the catalog
  > mcp-add: tool for adding MCP servers to the registry
  > mcp-remove: tool for removing MCP servers from the registry
  > code-mode: write code that calls other MCPs directly
  > mcp-exec: execute tools that exist in the current session
  > mcp-config-set: tool for setting configuration values for MCP servers
  > mcp-discover: prompt for learning about dynamic server management
- Starting OAuth notification monitor
- Starting OAuth provider loops...
- Watching for configuration updates...
> Initialized in 2m7.698804833s
> Start stdio server
- Connecting to OAuth notification stream at http://localhost/notify/notifications/channel/external-oauth

