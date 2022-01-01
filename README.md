# vite-virtual-module-ssr-repro

## Steps to Reproduce

> NOTE: The project uses `type: "module"` and so requires a Node version above 12. (i think) i'm too tired to look this up. Maybe 14 to be sure.

1. Install dependencies:

   ```terminal
   npm i
   ```

2. Run the `server.js` file:

   ```terminal
   node server.js
   ```

3. Visit [http://localhost:3000/](http://localhost:3000/).

4. The webpage should report an error. Along with an error in the terminal console.

5. Optionally: Follow the instructions in the `server.js` file's `serverEntryModule` string's doc-comment to verify that the problem has to do with ssr.
