import cookieParser from "cookie-parser";
import express, { Application, Request, Response } from "express";
import config from "./config/env";
import cors from "cors";
import router from "./routes";
import notFound from "./middleware/notFound";
import errorHandler from "./middleware/error.middleware";

const app: Application = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

app.use(
  cors({
    origin: [
      config.app_url,
      "https://YOUR-FRONTEND-VERCEL-DOMAIN.vercel.app",
    ],
    credentials: true,
  }),
);

app.get("/", (req: Request, res: Response) => {
  res.send("Hello, World!");
});
app.use("/api", router);

app.use(notFound);
app.use(errorHandler);

export default app;
