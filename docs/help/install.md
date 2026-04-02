# Install

## Install ai-mde
1.  go to a folder that want to install ai-mde under

2.  git clone https://github.com/AI-MDE/ai-mde.git

3.  an ai-mde folder will be created with the install

4.  cd ai-mde

5.  npm install

## Create a project
1.  cd ai-mde or where you installed above

```
  npm run create-project -- NEW-PROJECT-PATH

```

the abouve routine will create some files that are seed files point
>   CLAUDE.md   from app-template
>   AGENT.md
>   configuration.json
But will modify these files to point to ai-mde installation above


## Pre-requisites

1.  vs-code to view and edit files or another ide
2.  One of the following AI Models
-   claude code with vs-code extension (preferred)
-   codex open-api with vs-code extension
-   gemini with vs-code extension
3.  git installed
4.  node installed


## app doc Viewer

The viewer is a simple nodejs app to allow you to view and browse your documents

```bash
    npm run viewer -- <PROJECT-PATH>
```
```text
> claims-management-system@0.1.0 viewer
> node mde/web/app.js

[viewer] Starting server for project root: C:\Users\ralph\test-app
[viewer] Launching: C:\Users\ralph\test-app\mde\web\viewer.js
[viewer] Loaded configuration with 5 phases, 31 commands, and 5 patterns.
[viewer 2026-03-27T04:50:35.357Z] Editable directories: ["design/entities"]
Design Document Viewer running at http://localhost:4000
Docs root: C:\Users\ralph\test-app
Config: Claims Management System
Viewer log level: info
[viewer] Ready: http://localhost:4000/
[viewer] Press Ctrl+C to stop.

```
  open the browser @ http://localhost:4000

---

## Next steps

→ [Getting Started](./getting-started.md)







