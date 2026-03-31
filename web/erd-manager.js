/**
 * ERD Manager for AI-MDE Viewer
 * Handles Cytoscape initialization, loading, saving, moving, and resizing.
 */

let cy;
let selectedNode = null;
let overlay = null;
let handle = null;

const erdStyles = [
  {
    selector: 'node',
    style: {
      'label': 'data(name)',
      'shape': 'round-rectangle',
      'background-color': '#ffffff',
      'border-width': 2,
      'border-color': '#2c6bed',
      'width': 'data(width)',
      'height': 'data(height)',
      'text-valign': 'center',
      'text-halign': 'center',
      'font-size': '12px',
      'color': '#1b2430',
      'padding': '10px'
    }
  },
  {
    selector: 'edge',
    style: {
      'width': 2,
      'line-color': '#d9e0ea',
      'target-arrow-color': '#d9e0ea',
      'target-arrow-shape': 'triangle',
      'curve-style': 'bezier',
      'label': 'data(relationship)',
      'font-size': '10px',
      'text-rotation': 'autorotate'
    }
  },
  {
    selector: ':selected',
    style: {
      'border-color': '#1f9d55',
      'border-width': 3
    }
  }
];

/**
 * Initialize the ERD
 * @param {string} containerId - The ID of the HTML element to host the diagram
 * @param {Object} elements - Initial elements (nodes and edges)
 */
function initERD(containerId, elements) {
  overlay = document.getElementById('node-resize-overlay');
  handle = document.getElementById('node-resize-handle');
  setupResizeHandle();

  cy = cytoscape({
    container: document.getElementById(containerId),
    elements: elements,
    style: erdStyles,
    layout: { name: 'preset' } // Use preset to respect loaded positions
  });

  setupEvents();
}

function setupEvents() {
  // Handle Move / Dragging
  cy.on('dragfree', 'node', (evt) => {
    const node = evt.target;
    console.log(`Node ${node.id()} moved to`, node.position());
    updateResizeOverlay(node);
  });

  // Handle Selection for Resizing
  cy.on('select', 'node', (evt) => {
    selectedNode = evt.target;
    showResizeOverlay(selectedNode);
  });

  cy.on('unselect', 'node', () => {
    selectedNode = null;
    hideResizeOverlay();
  });

  cy.on('pan zoom', () => {
    if (selectedNode) updateResizeOverlay(selectedNode);
  });
}

/**
 * Resize Logic
 */
function showResizeOverlay(node) {
  overlay.style.display = 'block';
  updateResizeOverlay(node);
}

function hideResizeOverlay() {
  overlay.style.display = 'none';
}

function updateResizeOverlay(node) {
  const pos = node.renderedPosition();
  const w = node.renderedWidth();
  const h = node.renderedHeight();

  overlay.style.left = `${pos.x - w / 2}px`;
  overlay.style.top = `${pos.y - h / 2}px`;
  overlay.style.width = `${w}px`;
  overlay.style.height = `${h}px`;
}

function setupResizeHandle() {
  let isResizing = false;

  handle.addEventListener('mousedown', (e) => {
    if (!selectedNode) return;
    isResizing = true;
    e.preventDefault();
    
    const startX = e.clientX;
    const startY = e.clientY;
    const startW = selectedNode.data('width') || 100;
    const startH = selectedNode.data('height') || 60;

    const onMouseMove = (moveEvent) => {
      if (!isResizing) return;
      
      const zoom = cy.zoom();
      const dx = (moveEvent.clientX - startX) / zoom;
      const dy = (moveEvent.clientY - startY) / zoom;

      selectedNode.data('width', Math.max(50, startW + dx));
      selectedNode.data('height', Math.max(30, startH + dy));
      
      updateResizeOverlay(selectedNode);
    };

    const onMouseUp = () => {
      isResizing = false;
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  });
}

/**
 * Save Functionality
 * Exports the state to a JSON structure
 */
function saveERD() {
  const data = cy.elements().map(el => {
    return {
      group: el.group(),
      data: el.data(),
      position: el.isNode() ? el.position() : undefined
    };
  });
  console.log('Saved ERD State:', JSON.stringify(data, null, 2));
  return data;
}

/**
 * Exports to a local file
 */
function exportToFile() {
  const data = saveERD();
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'erd-export.json';
  link.click();
  URL.revokeObjectURL(url);
}

/**
 * Imports from a local file
 */
function importFromFile() {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.json';
  input.onchange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      loadERD(JSON.parse(ev.target.result));
    };
    reader.readAsText(file);
  };
  input.click();
}

/**
 * Load Functionality
 * Re-populates the graph
 */
function loadERD(jsonData) {
  cy.elements().remove();
  cy.add(jsonData);
  cy.layout({ name: 'preset' }).run();
  cy.fit();
}

// Example Export for use in viewer-client.js
window.ERDManager = {
  init: initERD,
  save: saveERD,
  load: loadERD,
  export: exportToFile,
  import: importFromFile
};
