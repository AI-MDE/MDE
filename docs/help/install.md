# Install

This is not your typical app, it is an AI orchastrator tool, so install is a bit different. Too easy actually.


Now ai-mde sites on its own folder

to install ai-mde
## Install ai-mde
1.  go to a folder that want to install ai-mde under
2.  git clone https://github.com/AI-MDE/ai-mde.git
3.  an ai-mde folder will be created with the install
4.  cd ai-mde
5.  npm install

## Create a project
1.  create a new folder that you want to house your application
```
    cd myApp
```
2.  npm run 


## Pre-requisites

1.  vs-code to view and edit files or another ide
2.  One of the following AI Models
-   claude code with vs-code extension (preferred)
-   codex open-api with vs-code extension
-   gemini with vs-code extension
3.  git installed
4.  node installed


## No Viewer Install
1.  Select your target folder
```bash
    mkdir \sample-project
    cd \sample-project

    ## the line below clones the repo into current folder notice .
    git https://github.com/AI-MDE/ai-mde.git . 

```
That is all is required, your folder sample-project is now your working directory ai-mde is installed as a subdirectory 'mde'

## Viewer Install

The viewer is a simple nodejs app to allow you to view and browse your documents

1.  run npm install
```bash
    npm install
```
2.  start the viewer
```bash
    npm run viewer
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
3.  open the browser @ http://localhost:4000






