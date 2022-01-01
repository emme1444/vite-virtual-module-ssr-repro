import fs from "fs";
import path from "path";
import express from "express";
import { createServer as createViteServer } from "vite";
import react from "@vitejs/plugin-react";

const serverEntryModule = `
import ReactDOMServer from "react-dom/server";
import SomethingApp from "@something/app.jsx"; // <-- this is the import causing problems (i think)

/**
 * The below is here as a stub to (maybe) show that the problem is the ssr stuff.
 * Uncomment the below 5 (6) lines and comment out the non-working
 * "@something/app.jsx" import on the line above. Then restart the server.
 * Now things work fine as the "ssrLoadModule" function is able to evaluate
 * and import the below (file) module, but not the virtual module above.
 */
// import CustomApp from "/src/routes/_app.jsx";

// const SomethingApp = () => {
//   const App = CustomApp;
//   return <App />;
// };

export const render = (url, context) => {
  return ReactDOMServer.renderToString(<SomethingApp />);
};
`;

const clientEntryModule = `
import ReactDOM from "react-dom";
import SomethingApp from "@something/app.jsx"; // <-- however, this works fine on the client

ReactDOM.hydrate(
  <SomethingApp />,
  document.getElementById('app')
);
`;

const appModule = `
import CustomApp from "/src/routes/_app.jsx";

const SomethingApp = () => {
  const App = CustomApp;
  return <App />;
};

export default SomethingApp;
`;

const createServer = async () => {
  const app = express();

  const vite = await createViteServer({
    server: { middlewareMode: "ssr" },
    optimizeDeps: {
      include: ["react", "react-dom"],
    },
    plugins: [
      react(),
      (() => {
        const prefix = "\0";
        const serverModuleId = "@something/server-entry.jsx";
        const clientModuleId = "@something/client-entry.jsx";
        const appModuleId = "@something/app.jsx";
        const resolvedServerModuleId = prefix + serverModuleId;
        const resolvedClientModuleId = prefix + clientModuleId;
        const resolvedAppModuleId = prefix + appModuleId;

        return {
          name: "vite-plugin-react-something-virtual-modules",
          enforce: "pre",
          resolveId(id) {
            switch (id) {
              case serverModuleId:
                return resolvedServerModuleId;
              case clientModuleId:
                return resolvedClientModuleId;
              case appModuleId:
                return resolvedAppModuleId;
              default:
                return null;
            }
          },
          load(id) {
            switch (id) {
              case resolvedServerModuleId:
                return serverEntryModule;
              case resolvedClientModuleId:
                return clientEntryModule;
              case resolvedAppModuleId:
                return appModule;
              default:
                return null;
            }
          },
        };
      })(),
    ],
  });

  app.use(vite.middlewares);

  app.use("*", async (req, res) => {
    const url = req.originalUrl;

    try {
      // 1. Read index.html
      let template = fs.readFileSync(
        path.resolve(
          path.dirname(new URL(import.meta.url).pathname),
          "index.html"
        ),
        "utf-8"
      );

      // 2. Apply Vite HTML transforms. This injects the Vite HMR client, and
      //    also applies HTML transforms from Vite plugins, e.g. global preambles
      //    from @vitejs/plugin-react
      template = await vite.transformIndexHtml(url, template);

      // 3. Load the server entry. vite.ssrLoadModule automatically transforms
      //    your ESM source code to be usable in Node.js! There is no bundling
      //    required, and provides efficient invalidation similar to HMR.
      const { render } = await vite.ssrLoadModule(
        "/@id/@something/server-entry.jsx"
      );

      // 4. render the app HTML. This assumes entry-server.js's exported `render`
      //    function calls appropriate framework SSR APIs,
      //    e.g. ReactDOMServer.renderToString()
      const appHtml = await render(url);

      // 5. Inject the app-rendered HTML into the template.
      const html = template.replace(`<!--@something-ssr-->`, appHtml);

      // 6. Send the rendered HTML back.
      res.status(200).set({ "Content-Type": "text/html" }).end(html);
    } catch (e) {
      // If an error is caught, let Vite fix the stacktrace so it maps back to
      // your actual source code.
      vite.ssrFixStacktrace(e);
      console.error(e);
      res.status(500).end(e.message);
    }
  });

  app.listen(3000);
};

createServer();
