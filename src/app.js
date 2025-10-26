import express from "express";
import morgan from "morgan";
import cookieParser from "cookie-parser";
import cors from "cors";
import createError from "http-errors";
import helmet from "helmet";
import { apiRouter } from "./routers/routers.js";
import { developmentOrigin, nodeEnv, productionOrigin } from "../important.js";

const app = express();

app.use(
  helmet({
    // Content Security Policy - Controls what resources can be loaded
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"], // Only load resources from same origin
        scriptSrc: ["'self'"], // Only allow scripts from same origin
        styleSrc: ["'self'", "'unsafe-inline'"], // Allow inline styles (needed for some frameworks)
        imgSrc: ["'self'", "data:", "https:"], // Allow images from self, data URIs, and HTTPS
        connectSrc: ["'self'"], // API calls only to same origin
        fontSrc: ["'self'"], // Fonts only from same origin
        objectSrc: ["'none'"], // Disable plugins like Flash
        mediaSrc: ["'self'"], // Media only from same origin
        frameSrc: ["'none'"], // Prevent embedding in iframes
      },
    },

    // HTTP Strict Transport Security - Force HTTPS
    hsts: {
      maxAge: 31536000, // 1 year in seconds
      includeSubDomains: true, // Apply to all subdomains
      preload: true, // Submit to browser HSTS preload list
    },

    // X-Frame-Options - Prevent clickjacking
    frameguard: {
      action: "deny", // Don't allow site to be in iframe at all
    },

    // X-Content-Type-Options - Prevent MIME sniffing
    noSniff: true,

    // X-DNS-Prefetch-Control - Control DNS prefetching
    dnsPrefetchControl: {
      allow: false,
    },

    // X-Download-Options - Prevent IE from executing downloads
    ieNoOpen: true,

    // Referrer-Policy - Control referrer information
    referrerPolicy: {
      policy: "strict-origin-when-cross-origin",
    },

    // X-Permitted-Cross-Domain-Policies - Restrict Adobe Flash/PDF
    permittedCrossDomainPolicies: {
      permittedPolicies: "none",
    },

    // Remove X-Powered-By header (hides Express)
    hidePoweredBy: true,
  })
);

const allowedOrigins =
  nodeEnv === "development" ? [developmentOrigin] : [productionOrigin];

app.use(
  cors({
    origin: ["https://stockify-f1765.web.app"],
    // origin: allowedOrigins,
    optionsSuccessStatus: 200,
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "Cookie"],
    exposedHeaders: ["Set-Cookie"],
  })
);

app.use(morgan("dev"));
app.use(cookieParser());
// app.use(express.json());
// app.use(express.urlencoded({ extended: true }));
app.use(express.json({ limit: "10mb" })); // Add payload size limit
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

app.use((req, res, next) => {
  req.setTimeout(30000); // 30 seconds
  res.setTimeout(30000);
  next();
});

// routes
app.use("/api/v1", apiRouter);

app.get("/", (req, res) => {
  res.status(200).send({ success: true, message: "Server is running" });
});

// 404 handler
app.use((req, res, next) => {
  next(createError(404, "Route not found!"));
});

// Error handler
app.use((err, req, res, next) => {
  return res.status(err.status || 500).json({
    success: false,
    message: err.message,
  });
});

export default app;
