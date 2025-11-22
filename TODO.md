# Render Distance Optimization with localStorage Persistence

- User aprovment [True!]

Warning: make sure you do step by step (i mean, do not try to do all at the same time because you may dont remember what changes you have done, which is crucial to know in case we must fix bugs and issues)

## Tasks
- [Done!] assure the code is corectly optimized and does not waste resources from the players devices
- [working_With_issues] Add renderDistance property to Renderer constructor so it does not load all world in RAM
- [Done!] Modify setWorld() to initialize the spawn chunks with loaded: true
- [Done!] make sure the chunks size is allways 16x16x16
- [Done!] make sure the render distance applys for above and under the player (usa la mitad del valor elegido para el renderizado inferior por ejemplo si es 8 chunks queda en 4)
- [Done!] apply an option to do not render all the chunks behind the player (an option that is disabled from default)
- [Done!] Add isChunkInRange() method to Renderer
- [Done!] Add unloadChunk() method to Render.js and world.js so it will be given to localstorage instead of RAM to improve peformance and better resources magnament and to avoid lose player progress (From RAM to localStorage)
- [Done!] Add loadChunk() method to Renderer (from localstorage to RAM)
- [Done!] Add updateChunks() method to Renderer
- [Done!] Modify draw() to call updateChunks() and only render loaded chunks
- [Done!] Modify buildChunks() to only build loaded chunks (effectively done via dirty flag on loaded chunks)
- [Done!] Add createChunkFromString() method to World class (world.js)
- [peforming!] Test the implementation by running copyng on xampp and going to localhost

debug display [Done!]
