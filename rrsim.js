const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

const config = {
    robotSize: 20,
    robotSpeed: 1.5,
    repulsiveForce: 150,
    attractiveForce: 120,
    noiseGain: 2,
    sensorRange: 40,
    boundaryForce: 100,
    numSensorPoints: 24,
    sensorPointSpacing: 5,
    homeBaseCounter: 0,
    enableBoundary: true,
    wallThickness: 10,
    minWallLength: 40
};

const STATES = {
    EDITING: 'EDITING',
    RUNNING: 'RUNNING',
    PAUSED: 'PAUSED'
};

const OBJECT_TYPES = {
    WALL: 'WALL',
    HOMEBASE: 'HOMEBASE',
    OBSTACLE: 'OBSTACLE',
    START: 'START'
};

const TOOLS = {
    SELECT: 'SELECT',
    WALL: 'WALL',
    HOMEBASE: 'HOMEBASE',
    OBSTACLE: 'OBSTACLE',
    START: 'START',
    DELETE: 'DELETE'
};

class Vector2D {
    constructor(x = 0, y = 0) {
        this.x = x;
        this.y = y;
    }

    add(v) {
        return new Vector2D(this.x + v.x, this.y + v.y);
    }

    subtract(v) {
        return new Vector2D(this.x - v.x, this.y - v.y);
    }

    multiply(scalar) {
        return new Vector2D(this.x * scalar, this.y * scalar);
    }

    magnitude() {
        return Math.sqrt(this.x * this.x + this.y * this.y);
    }

    normalize() {
        const mag = this.magnitude();
        if (mag === 0) return new Vector2D();
        return this.multiply(1 / mag);
    }

    limit(max) {
        const mag = this.magnitude();
        if (mag > max) {
            return this.normalize().multiply(max);
        }
        return new Vector2D(this.x, this.y);
    }

    dot(v) {
        return this.x * v.x + this.y * v.y;
    }
}

class Line {
    constructor(x1, y1, x2, y2) {
        this.start = new Vector2D(x1, y1);
        this.end = new Vector2D(x2, y2);
    }

    distanceToPoint(point) {
        const line = this.end.subtract(this.start);
        const len = line.magnitude();
        if (len === 0) return point.subtract(this.start).magnitude();

        const t = Math.max(0, Math.min(1, point.subtract(this.start).dot(line) / (len * len)));
        const projection = this.start.add(line.multiply(t));
        return point.subtract(projection).magnitude();
    }
}

class SensorPoint {
    constructor(x, y, parent) {
        this.position = new Vector2D(x, y);
        this.parent = parent;
        this.detectedObjects = [];
    }

    update(x, y) {
        this.position.x = x;
        this.position.y = y;
        this.detectedObjects = [];
    }

    detect(object) {
        if (object.type === OBJECT_TYPES.WALL) {
            const dist = object.distanceToPoint(this.position);
            if (dist < config.sensorRange) {
                this.detectedObjects.push({ object, distance: dist });
            }
        } else {
            const dist = Math.sqrt(
                Math.pow(object.x - this.position.x, 2) +
                Math.pow(object.y - this.position.y, 2)
            );
            if (dist < config.sensorRange) {
                this.detectedObjects.push({ object, distance: dist });
            }
        }
    }
}

class Robot {
    constructor(x, y) {
        this.position = new Vector2D(x, y);
        this.velocity = new Vector2D();
        this.acceleration = new Vector2D();
        this.angle = 0;
        this.sensorPoints = [];
        this.targetNumber = 1;
        this.collisionRadius = config.robotSize / 2;
        this.initializeSensorPoints();
    }

    initializeSensorPoints() {
        this.sensorPoints = [];
        for (let i = 0; i < config.numSensorPoints; i++) {
            const angle = (i * Math.PI * 2) / config.numSensorPoints;
            const sensorX = this.position.x + Math.cos(angle) * config.sensorRange;
            const sensorY = this.position.y + Math.sin(angle) * config.sensorRange;
            this.sensorPoints.push(new SensorPoint(sensorX, sensorY, this));
        }
    }

    updateSensorPoints() {
        this.sensorPoints.forEach((point, i) => {
            const angle = (i * Math.PI * 2) / config.numSensorPoints;
            point.update(
                this.position.x + Math.cos(angle) * config.sensorRange,
                this.position.y + Math.sin(angle) * config.sensorRange
            );
        });
    }

    draw(ctx) {
        // Draw sensor field
        ctx.beginPath();
        ctx.arc(this.position.x, this.position.y, config.sensorRange, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(0, 255, 0, 0.05)';
        ctx.fill();

        // Draw sensor points and detected objects
        this.sensorPoints.forEach(point => {
            ctx.beginPath();
            ctx.moveTo(this.position.x, this.position.y);
            ctx.lineTo(point.position.x, point.position.y);
            ctx.strokeStyle = point.detectedObjects.length > 0 ? 'rgba(255, 0, 0, 0.3)' : 'rgba(0, 255, 0, 0.2)';
            ctx.stroke();
            
            ctx.beginPath();
            ctx.arc(point.position.x, point.position.y, 2, 0, Math.PI * 2);
            ctx.fillStyle = point.detectedObjects.length > 0 ? 'rgba(255, 0, 0, 0.5)' : 'rgba(0, 255, 0, 0.3)';
            ctx.fill();
        });

        // Draw robot body
        ctx.beginPath();
        ctx.arc(this.position.x, this.position.y, this.collisionRadius, 0, Math.PI * 2);
        ctx.fillStyle = '#FFD700';
        ctx.fill();
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.lineWidth = 1;

        // Draw direction indicator
        ctx.beginPath();
        ctx.moveTo(this.position.x, this.position.y);
        ctx.lineTo(
            this.position.x + Math.cos(this.angle) * config.robotSize,
            this.position.y + Math.sin(this.angle) * config.robotSize
        );
        ctx.strokeStyle = '#FF0000';
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.lineWidth = 1;
    }

    applyForce(force) {
        this.acceleration = this.acceleration.add(force);
    }

    detectCollisions(world) {
        let collision = false;
        world.objects.forEach(obj => {
            if (obj.type === OBJECT_TYPES.WALL) {
                const dist = obj.distanceToPoint(this.position);
                if (dist < this.collisionRadius + config.wallThickness/2) {
                    collision = true;
                }
            } else if (obj.type === OBJECT_TYPES.OBSTACLE) {
                const dist = Math.sqrt(
                    Math.pow(obj.x - this.position.x, 2) +
                    Math.pow(obj.y - this.position.y, 2)
                );
                if (dist < this.collisionRadius + obj.radius) {
                    collision = true;
                }
            }
        });
        return collision;
    }

    calculateForces(world) {
        this.acceleration = new Vector2D();
        
        // Update sensor detections
        this.sensorPoints.forEach(sensor => {
            world.objects.forEach(obj => {
                if (obj.type !== OBJECT_TYPES.HOMEBASE && obj.type !== OBJECT_TYPES.START) {
                    sensor.detect(obj);
                }
            });
        });

        // Calculate repulsive forces from detected objects
        this.sensorPoints.forEach(sensor => {
            sensor.detectedObjects.forEach(detection => {
                let repulsionForce;
                if (detection.object.type === OBJECT_TYPES.WALL) {
                    const normalizedDist = detection.distance / config.sensorRange;
                    const repulsion = (1 - normalizedDist) * config.repulsiveForce;
                    const direction = this.position.subtract(new Vector2D(
                        detection.object.start.x + (detection.object.end.x - detection.object.start.x) / 2,
                        detection.object.start.y + (detection.object.end.y - detection.object.start.y) / 2
                    )).normalize();
                    repulsionForce = direction.multiply(repulsion);
                } else {
                    const normalizedDist = detection.distance / config.sensorRange;
                    const repulsion = (1 - normalizedDist) * config.repulsiveForce;
                    const direction = this.position.subtract(new Vector2D(detection.object.x, detection.object.y)).normalize();
                    repulsionForce = direction.multiply(repulsion);
                }
                this.applyForce(repulsionForce);
            });
        });

        // Calculate attractive force to current target
        const target = world.objects.find(obj => 
            obj.type === OBJECT_TYPES.HOMEBASE && obj.number === this.targetNumber
        );
        if (target) {
            const targetPos = new Vector2D(target.x, target.y);
            const distanceToTarget = this.position.subtract(targetPos).magnitude();
            
            if (distanceToTarget < target.radius + this.collisionRadius) {
                // Target reached, move to next target
                this.targetNumber = (this.targetNumber % config.homeBaseCounter) + 1;
            } else {
                const attractionForce = targetPos.subtract(this.position)
                    .normalize()
                    .multiply(config.attractiveForce);
                this.applyForce(attractionForce);
            }
        }

        // Add noise for more natural movement
        const noise = new Vector2D(
            (Math.random() * 2 - 1) * config.noiseGain,
            (Math.random() * 2 - 1) * config.noiseGain
        );
        this.applyForce(noise);

        // Add boundary repulsion if enabled
        if (config.enableBoundary) {
            const bounds = {
                left: 0,
                right: canvas.width,
                top: 0,
                bottom: canvas.height
            };
            
            const margin = 50;
            let boundaryForce = new Vector2D();

            if (this.position.x < margin) {
                boundaryForce.x = (margin - this.position.x) * (config.boundaryForce / margin);
            } else if (this.position.x > canvas.width - margin) {
                boundaryForce.x = (canvas.width - margin - this.position.x) * (config.boundaryForce / margin);
            }

            if (this.position.y < margin) {
                boundaryForce.y = (margin - this.position.y) * (config.boundaryForce / margin);
            } else if (this.position.y > canvas.height - margin) {
                boundaryForce.y = (canvas.height - margin - this.position.y) * (config.boundaryForce / margin);
            }

            this.applyForce(boundaryForce);
        }
    }

    update() {
        this.velocity = this.velocity.add(this.acceleration);
        this.velocity = this.velocity.limit(config.robotSpeed);
        this.position = this.position.add(this.velocity);
        
        // Aggiungi questi controlli per mantenere il robot dentro i bordi
        this.position.x = Math.max(this.collisionRadius, Math.min(canvas.width - this.collisionRadius, this.position.x));
        this.position.y = Math.max(this.collisionRadius, Math.min(canvas.height - this.collisionRadius, this.position.y));
        
        // Update robot angle based on velocity
        if (this.velocity.magnitude() > 0.01) {
            this.angle = Math.atan2(this.velocity.y, this.velocity.x);
        }
        
        this.updateSensorPoints();
        this.acceleration = new Vector2D();
    }
}

class World {
    constructor() {
        this.objects = [];
        this.robot = null;
        this.state = STATES.EDITING;
        this.selectedTool = TOOLS.SELECT;
        this.selectedObject = null;
        this.dragStart = null;
        this.tempObject = null;
    }

    addObject(object) {
        if (object.type === OBJECT_TYPES.START && this.robot === null) {
            this.robot = new Robot(object.x, object.y);
        }
        if (object.type === OBJECT_TYPES.HOMEBASE) {
            config.homeBaseCounter++;
            object.number = config.homeBaseCounter;
        }
        this.objects.push(object);
        this.updateStatus();
    }

    removeObject(object) {
        const index = this.objects.indexOf(object);
        if (index > -1) {
            if (object.type === OBJECT_TYPES.HOMEBASE) {
                config.homeBaseCounter--;
                // Renumber remaining homebases
                let currentNumber = 1;
                this.objects.forEach(obj => {
                    if (obj.type === OBJECT_TYPES.HOMEBASE) {
                        obj.number = currentNumber++;
                    }
                });
            }
            this.objects.splice(index, 1);
        }
        this.updateStatus();
    }

    update() {
        if (this.state === STATES.RUNNING && this.robot) {
            const previousPosition = new Vector2D(this.robot.position.x, this.robot.position.y);
            this.robot.calculateForces(this);
            this.robot.update();
            
            // Check for collisions and revert position if collision detected
            if (this.robot.detectCollisions(this)) {
                this.robot.position = previousPosition;
                this.robot.velocity = new Vector2D();
            }
        }
    }

    draw() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Draw grid
        ctx.strokeStyle = '#ddd';
        ctx.lineWidth = 0.5;
        const gridSize = 40;
        for (let x = 0; x < canvas.width; x += gridSize) {
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, canvas.height);
            ctx.stroke();
        }
        for (let y = 0; y < canvas.height; y += gridSize) {
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(canvas.width, y);
            ctx.stroke();
        }

        // Draw objects
        this.objects.forEach(obj => {
            if (obj.type === OBJECT_TYPES.WALL) {
                ctx.beginPath();
                ctx.moveTo(obj.start.x, obj.start.y);
                ctx.lineTo(obj.end.x, obj.end.y);
                ctx.lineWidth = config.wallThickness;
                ctx.strokeStyle = '#333';
                ctx.stroke();
                ctx.lineWidth = 1;
            } else if (obj.type === OBJECT_TYPES.HOMEBASE) {
                ctx.beginPath();
                ctx.arc(obj.x, obj.y, obj.radius, 0, Math.PI * 2);
                ctx.fillStyle = '#4CAF50';
                ctx.fill();
                ctx.strokeStyle = '#333';
                ctx.stroke();
                
                // Draw number
                ctx.fillStyle = 'white';
                ctx.font = '16px Arial';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(obj.number.toString(), obj.x, obj.y);
            } else if (obj.type === OBJECT_TYPES.OBSTACLE) {
                ctx.beginPath();
                ctx.arc(obj.x, obj.y, obj.radius, 0, Math.PI * 2);
                ctx.fillStyle = '#FF4444';
                ctx.fill();
                ctx.strokeStyle = '#333';
                ctx.stroke();
            }
        });

        // Draw temporary object during placement
        if (this.tempObject) {
            if (this.tempObject.type === OBJECT_TYPES.WALL) {
                ctx.beginPath();
                ctx.moveTo(this.tempObject.start.x, this.tempObject.start.y);
                ctx.lineTo(this.tempObject.end.x, this.tempObject.end.y);
                ctx.lineWidth = config.wallThickness;
                ctx.strokeStyle = 'rgba(51, 51, 51, 0.5)';
                ctx.stroke();
                ctx.lineWidth = 1;
            }
        }

        // Draw robot
        if (this.robot) {
            this.robot.draw(ctx);
        }

        // Draw selected object highlight
        if (this.selectedObject) {
            ctx.strokeStyle = '#2196F3';
            ctx.lineWidth = 2;
            if (this.selectedObject.type === OBJECT_TYPES.WALL) {
                ctx.beginPath();
                ctx.moveTo(this.selectedObject.start.x, this.selectedObject.start.y);
                ctx.lineTo(this.selectedObject.end.x, this.selectedObject.end.y);
                ctx.stroke();
            } else {
                ctx.beginPath();
                ctx.arc(this.selectedObject.x, this.selectedObject.y, 
                    this.selectedObject.radius + 2, 0, Math.PI * 2);
                ctx.stroke();
            }
            ctx.lineWidth = 1;
        }
    }

    updateStatus() {
        document.getElementById('currentState').textContent = `State: ${this.state}`;
        document.getElementById('objectInfo').textContent = 
            `Objects: ${this.objects.length} (Homebases: ${config.homeBaseCounter})`;
    }

    reset() {
        // Reset robot position
        if (this.robot) {
            const startPoint = this.objects.find(obj => obj.type === OBJECT_TYPES.START);
            if (startPoint) {
                this.robot.position = new Vector2D(startPoint.x, startPoint.y);
                this.robot.velocity = new Vector2D();
                this.robot.acceleration = new Vector2D();
                this.robot.targetNumber = 1;
            }
        }
        // Reset world state to EDITING
        this.state = STATES.EDITING;
        // Reset selection state
        this.selectedObject = null;
        this.dragStart = null;
        this.tempObject = null;
        
        // Update UI
        this.updateStatus();
        this.updateToolButtons();
    }


    clear() {
        this.objects = [];
        this.robot = null;
        config.homeBaseCounter = 0;
        this.updateStatus();
    }

    updateToolButtons() {
        Object.keys(toolButtons).forEach(id => {
            document.getElementById(id).disabled = false;
        });
        // Reselect the currently selected tool
        const currentToolButton = Object.entries(toolButtons)
            .find(([, tool]) => tool === this.selectedTool)?.[0];
        if (currentToolButton) {
            document.getElementById(currentToolButton).classList.add('selected');
        }
    }

    // Aggiungi questi metodi alla classe World, appena prima della parentesi graffa finale;
    serialize() {
        const worldData = {
            objects: this.objects.map(obj => {
                if (obj.type === OBJECT_TYPES.WALL) {
                    return {
                        type: obj.type,
                        start: { x: obj.start.x, y: obj.start.y },
                        end: { x: obj.end.x, y: obj.end.y }
                    };
                } else {
                    return {
                        type: obj.type,
                        x: obj.x,
                        y: obj.y,
                        radius: obj.radius,
                        number: obj.type === OBJECT_TYPES.HOMEBASE ? obj.number : undefined
                    };
                }
            }),
            config: {
                homeBaseCounter: config.homeBaseCounter,
                robotSpeed: config.robotSpeed,
                repulsiveForce: config.repulsiveForce,
                attractiveForce: config.attractiveForce,
                noiseGain: config.noiseGain,
                sensorRange: config.sensorRange,
                boundaryForce: config.boundaryForce,
                enableBoundary: config.enableBoundary
            }
        };
        return JSON.stringify(worldData, null, 2);
    }

    deserialize(jsonString) {
        try {
            const worldData = JSON.parse(jsonString);
            
            // Clear current world state
            this.clear();
            
            // Validate the data structure
            if (!worldData.objects || !Array.isArray(worldData.objects)) {
                throw new Error("Invalid world data format");
            }

            // Load non-homebase configuration
            if (worldData.config) {
                // Copiamo tutto tranne homeBaseCounter
                const { homeBaseCounter, ...otherConfig } = worldData.config;
                Object.assign(config, otherConfig);
                
                // Update UI controls
                document.getElementById('robotSpeed').value = config.robotSpeed;
                document.getElementById('repulsiveForce').value = config.repulsiveForce;
                document.getElementById('attractiveForce').value = config.attractiveForce;
                document.getElementById('noiseGain').value = config.noiseGain;
                document.getElementById('sensorRange').value = config.sensorRange;
                document.getElementById('boundaryForce').value = config.boundaryForce;
                document.getElementById('enableBoundary').checked = config.enableBoundary;
            }

            // Prima carichiamo tutti gli oggetti non-homebase
            worldData.objects
                .filter(obj => obj.type !== OBJECT_TYPES.HOMEBASE)
                .forEach(obj => {
                    if (obj.type === OBJECT_TYPES.WALL) {
                        const wall = {
                            type: OBJECT_TYPES.WALL,
                            start: new Vector2D(obj.start.x, obj.start.y),
                            end: new Vector2D(obj.end.x, obj.end.y),
                            distanceToPoint: function(point) {
                                return new Line(this.start.x, this.start.y, 
                                    this.end.x, this.end.y).distanceToPoint(point);
                            }
                        };
                        this.addObject(wall);
                    } else {
                        const newObj = {
                            type: obj.type,
                            x: obj.x,
                            y: obj.y,
                            radius: obj.radius
                        };
                        this.addObject(newObj);
                    }
                });

            // Poi carichiamo le homebases in ordine
            // Importante: config.homeBaseCounter è ancora 0 qui
            const homebases = worldData.objects
                .filter(obj => obj.type === OBJECT_TYPES.HOMEBASE)
                .sort((a, b) => (a.number || 0) - (b.number || 0));

            // Aggiungiamo le homebases una alla volta
            homebases.forEach(obj => {
                const homebase = {
                    type: OBJECT_TYPES.HOMEBASE,
                    x: obj.x,
                    y: obj.y,
                    radius: obj.radius
                };
                this.addObject(homebase);  // Questo incrementerà homeBaseCounter e assegnerà il numero corretto
            });

            // Reset the world state
            this.reset();
            return true;

        } catch (error) {

            console.error("Error loading world:", error);
            return false;

        } 

    }

}

// Initialize world and UI controls
const world = new World();

// Animation loop
function animate() {
    world.update();
    world.draw();
    requestAnimationFrame(animate);
}

// Start animation
animate();

// Event Listeners for UI Controls
document.getElementById('playBtn').addEventListener('click', () => {
    world.state = STATES.RUNNING;
    world.updateStatus();
});

document.getElementById('pauseBtn').addEventListener('click', () => {
    world.state = STATES.PAUSED;
    world.updateStatus();
});

document.getElementById('resetBtn').addEventListener('click', () => {
    world.reset();
});


document.getElementById('clearBtn').addEventListener('click', () => {
    world.clear();
    world.state = STATES.EDITING;
    world.updateStatus();
});

// Tool selection
const toolButtons = {
    selectTool: TOOLS.SELECT,
    wallTool: TOOLS.WALL,
    homebaseTool: TOOLS.HOMEBASE,
    obstacleTool: TOOLS.OBSTACLE,
    startTool: TOOLS.START,
    deleteTool: TOOLS.DELETE
};

Object.entries(toolButtons).forEach(([buttonId, tool]) => {
    document.getElementById(buttonId).addEventListener('click', () => {
        world.selectedTool = tool;
        world.selectedObject = null;
        Object.keys(toolButtons).forEach(id => {
            document.getElementById(id).classList.remove('selected');
        });
        document.getElementById(buttonId).classList.add('selected');
    });
});

// Parameter controls
document.getElementById('robotSpeed').addEventListener('input', (e) => {
    config.robotSpeed = parseFloat(e.target.value);
});

document.getElementById('repulsiveForce').addEventListener('input', (e) => {
    config.repulsiveForce = parseFloat(e.target.value);
});

document.getElementById('attractiveForce').addEventListener('input', (e) => {
    config.attractiveForce = parseFloat(e.target.value);
});

document.getElementById('noiseGain').addEventListener('input', (e) => {
    config.noiseGain = parseFloat(e.target.value);
});

document.getElementById('sensorRange').addEventListener('input', (e) => {
    config.sensorRange = parseFloat(e.target.value);
    if (world.robot) {
        world.robot.initializeSensorPoints();
    }
});

document.getElementById('boundaryForce').addEventListener('input', (e) => {
    config.boundaryForce = parseFloat(e.target.value);
});

document.getElementById('enableBoundary').addEventListener('change', (e) => {
    config.enableBoundary = e.target.checked;
});


// Aggiungi questa variabile globale all'inizio del file, dopo la definizione delle costanti
let lastLoadedFile = null;

// Aggiungi questi event listeners dopo gli altri event listeners esistenti
document.getElementById('saveWorldBtn').addEventListener('click', () => {
    const worldData = world.serialize();
    const blob = new Blob([worldData], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'PFRS-config.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
});

document.getElementById('loadWorldBtn').addEventListener('click', () => {
    document.getElementById('worldFileInput').value = '';
    document.getElementById('worldFileInput').click();
});

document.getElementById('worldFileInput').addEventListener('change', (event) => {
    const file = event.target.files[0];
    
    if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            const success = world.deserialize(e.target.result);
            if (success) {
                lastLoadedFile = file;
            } else {
                alert('Error loading world file. Please check the file format.');
            }
        };
        reader.onerror = () => {
            alert('Error reading file');
            event.target.value = '';
        };
        reader.readAsText(file);

        
    }
});

// Canvas mouse event handlers
canvas.addEventListener('mousedown', handleMouseDown);
canvas.addEventListener('mousemove', handleMouseMove);
canvas.addEventListener('mouseup', handleMouseUp);

function handleMouseDown(e) {
        const rect = canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        // Verifica se siamo in stato di editing
        if (world.state !== STATES.EDITING) {
            return; // Esci se non siamo in modalità editing
        }
        switch (world.selectedTool) {
            case TOOLS.SELECT:
                world.selectedObject = null;
                for (const obj of world.objects) {
                    if (obj.type === OBJECT_TYPES.WALL) {
                        if (obj.distanceToPoint(new Vector2D(x, y)) < 10) {
                            world.selectedObject = obj;
                            break;
                        }
                    } else {
                        const dist = Math.sqrt(
                            Math.pow(obj.x - x, 2) + Math.pow(obj.y - y, 2)
                        );
                        if (dist < obj.radius) {
                            world.selectedObject = obj;
                            break;
                        }
                    }
                }
                world.dragStart = new Vector2D(x, y);
                break;

            case TOOLS.WALL:
                world.tempObject = {
                    type: OBJECT_TYPES.WALL,
                    start: new Vector2D(x, y),
                    end: new Vector2D(x, y),
                    distanceToPoint: function(point) {
                        return new Line(this.start.x, this.start.y, 
                            this.end.x, this.end.y).distanceToPoint(point);
                    }
                };
                break;

            case TOOLS.HOMEBASE:
                world.addObject({
                    type: OBJECT_TYPES.HOMEBASE,
                    x: x,y: y,
                    radius: 20
                });
                break;

            case TOOLS.OBSTACLE:
                world.addObject({
                    type: OBJECT_TYPES.OBSTACLE,
                    x: x,
                    y: y,
                    radius: 15
                });
                break;

            case TOOLS.START:
                // Remove any existing start point
                const existingStart = world.objects.find(obj => obj.type === OBJECT_TYPES.START);
                if (existingStart) {
                    world.removeObject(existingStart);
                }
                world.addObject({
                    type: OBJECT_TYPES.START,
                    x: x,
                    y: y,
                    radius: 10
                });
                world.robot = new Robot(x, y);
                break;

            case TOOLS.DELETE:
                for (const obj of world.objects) {
                    if (obj.type === OBJECT_TYPES.WALL) {
                        if (obj.distanceToPoint(new Vector2D(x, y)) < 10) {
                            world.removeObject(obj);
                            break;
                        }
                    } else {
                        const dist = Math.sqrt(
                            Math.pow(obj.x - x, 2) + Math.pow(obj.y - y, 2)
                        );
                        if (dist < obj.radius) {
                            world.removeObject(obj);
                            break;
                        }
                    }
                }
                break;
        }
}

function handleMouseMove(e) {
        const rect = canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        // Verifica se siamo in stato di editing
        if (world.state !== STATES.EDITING) {
            return; // Esci se non siamo in modalità editing
        }

        if (world.selectedTool === TOOLS.WALL && world.tempObject) {
            world.tempObject.end = new Vector2D(x, y);
        } else if (world.selectedTool === TOOLS.SELECT && world.selectedObject && world.dragStart) {
            const dx = x - world.dragStart.x;
            const dy = y - world.dragStart.y;

            if (world.selectedObject.type === OBJECT_TYPES.WALL) {
                world.selectedObject.start.x += dx;
                world.selectedObject.start.y += dy;
                world.selectedObject.end.x += dx;
                world.selectedObject.end.y += dy;
            } else {
                world.selectedObject.x += dx;
                world.selectedObject.y += dy;
            }

            world.dragStart = new Vector2D(x, y);
        }
    }

    function handleMouseUp(e) {
        // Verifica se siamo in stato di editing
        if (world.state !== STATES.EDITING) {
            return; // Esci se non siamo in modalità editing
        }

        if (world.selectedTool === TOOLS.WALL && world.tempObject) {
            const dx = world.tempObject.end.x - world.tempObject.start.x;
            const dy = world.tempObject.end.y - world.tempObject.start.y;
            const length = Math.sqrt(dx * dx + dy * dy);

            if (length >= config.minWallLength) {
                world.addObject(world.tempObject);
            }
            world.tempObject = null;
        }
        world.dragStart = null;
    }

// Initial state update
// Funzione per caricare il file di esempio come se fosse un file selezionato dall'utente
async function loadExampleWorld() {
    try {
        console.log("Starting to load the example world...");

        const response = await fetch('exampleworld.json');
        console.log("Fetch response received:", response);

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const worldData = await response.json();
        console.log("Successfully parsed JSON data:", worldData);

        // Converte l'oggetto in una stringa JSON prima di deserializzare
        const jsonString = JSON.stringify(worldData);
        const success = world.deserialize(jsonString); 
        console.log("Deserialization completed with status:", success);

    } catch (error) {
        console.error('Error loading example world:', error);
        alert('Error loading example world file. Please use a server (even a local one) and check that the "exampleworld.json" file is in the same folder of this javascript file, or the function that loads the example world will not work due to browser secure measures for the local files. If you want to remove this alert please remove or comment line 961 in "rrsim.js".\n\nThe example file will not be loaded but you will be able to use the simulator normally.');s
    }
}

// Inizializza il mondo e carica l'esempio
console.log("Initializing world...");
world.updateStatus();
console.log("World status updated, loading example world...");
loadExampleWorld();



