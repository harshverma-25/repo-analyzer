# Analyzer Scope & Known Limitations

## 1. Supported Capabilities

### 1.1 Express.js Route Discovery
- **Fully Supported**:
  - `app.METHOD(path, ...handlers)` where `METHOD` is `get`, `post`, `put`, `delete`, `patch`, `options`, `head`, `all`.
  - `router.METHOD(path, ...handlers)` instances created via `express.Router()`.
  - Static mount prefixes: `app.use('/api', apiRouter)`, `apiRouter.use('/users', userRouter)`.
  - Nested router chains across multiple files resolved via relative import tracking.
  - Named handler functions and middleware arrays (`[authMiddleware, validateBody, handler]`).
  - Route parameter extraction (`/users/:userId/posts/:postId`).
  - Response status code inference (e.g. `res.status(201).json(...)`).
- **Partially Supported / Inferred**:
  - Controller functions imported from other files are mapped by symbol name.
  - Request body schemas inferred when Zod or Joi validators are recognized in the middleware chain.
- **Unsupported / Flagged as Unresolved**:
  - Dynamically constructed route paths, such as `app.get(config.prefix + '/test')`.
  - Metaprogramming / dynamic route registration loops (`routes.forEach(r => app[r.method](...))`).

### 1.2 Mongoose Schema Discovery
- **Fully Supported**:
  - `new mongoose.Schema({ ... })` and `new Schema({ ... })`.
  - Common Mongoose field types: `String`, `Number`, `Boolean`, `Date`, `ObjectId` / `Schema.Types.ObjectId`, `Buffer`, `Array`.
  - Field options: `required`, `unique`, `default`, `enum`, `ref`.
  - Sub-schemas and embedded arrays.
  - Compound and single index declarations (`schema.index({ email: 1 }, { unique: true })`).
- **Limitations**:
  - Dynamic schema generation or schemas compiled inside factory functions.
  - Virtual properties and custom Mongoose plugins.

### 1.3 Language & Line Counting
- Language identification based on file extension and standard comment syntaxes (C-style `//` and `/* */`, Python/Ruby/Shell `#`, HTML `<!-- -->`).
- Files larger than 500KB or marked binary are skipped.

### 1.4 Architecture Graph
- Directed relations generated from static evidence: Route -> Handler -> Service -> Model -> Database.
- Unsupported or indirect dynamic invocations are not drawn to prevent hallucinated graphs.
