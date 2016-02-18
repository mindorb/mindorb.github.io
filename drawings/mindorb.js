/// <reference path="../webgl-frameworks/Three.js" />
/// <reference path="../Graph.js" />
/// <reference path="../utils/TrackballControls.js" />
/// <reference path="../utils/ObjectSelection.js" />
/**
  @author AhmadAboBakr

  WIP

 */

var Drawing = Drawing || {};

Drawing.Minorb = function (options) {
    var options = options || {};
    var id = 1;
    this.show_stats = options.showStats || false;
    this.show_info = options.showInfo || false;
    this.show_labels = options.showLabels || false;
    this.limit = options.limit || 1000;
    this.selection = true;
    this.lineVertex = options.lineVert;
    this.lineFrag = options.lineFrag;
    this.lineMaterial = null;
    var redrawEdges = false;
    var camera, controls, scene, renderer, interaction, geometry, object_selection;
    var stats;
    var info_text = {};
    var graph = new Graph({ limit: this.limit });
    var selectedHull = null;
    var edges;
    var hulls;
    var that = this;
    init();
    createGraph();
    animate();

    function init() {
        // Three.js initialization
        renderer = new THREE.WebGLRenderer({ alpha: true });
        renderer.setSize(window.innerWidth, window.innerHeight);

        camera = new THREE.PerspectiveCamera(40, window.innerWidth / window.innerHeight, 1, 1000000);
        //        camera = new THREE.OrthographicCamera(0, window.innerWidth ,0, window.innerHeight, 1, 1000000);
        camera.position.z = 5000;
        var nodes = [];
        controls = new THREE.TrackballControls(camera);
        controls.rotateSpeed = 0.5;
        controls.zoomSpeed = 5.2;
        controls.panSpeed = 1;

        controls.noZoom = false;
        controls.noPan = false;

        controls.staticMoving = false;

        controls.dynamicDampingFactor = 0.3;

        controls.keys = [65, 83, 68];
        controls.enabled = false;
        controls.addEventListener('change', render);
        //controls.enabled = false;


        scene = new THREE.Scene();
        edges = new THREE.Object3D();
        scene.add(edges);
        geometry = new THREE.CubeGeometry(50, 50, 50);

        // Create node selection, if set
        object_selection = new THREE.ObjectSelection({
            domElement: renderer.domElement,
            selected: function (obj) {
                // display info
                if (obj != null) {
                    if (obj.type == "node") {
                        info_text.select = "Object " + obj.id;
                    }
                } else {
                    delete info_text.select;
                }
            },
            clicked: function (obj) {
                if (obj != null && !controls.enabled) {
                    if (obj.type == "node") {
                        //graph.nodes[obj.nodeID].haveAHull = true;
                        graph.nodes[obj.nodeID].data.draw_object.add(graph.nodes[obj.nodeID].data.hullDrawObject);
                    }
                    else if (obj.type == "hull") {
                        parent = graph.getNode(obj.nodeID);
                        node = new Node(id++);
                        node.position = obj.intersectionPoint.clone();
                        drawNode(node, obj);
                        //node.data.draw_object.scale = new THREE.Vector3(1 / obj.scale.x, 1 / 1 / obj.scale.y, 1 / 1 / obj.scale.z);

                        graph.addNode(node);
                        edge = graph.addEdge(parent, node);
                        //drawEdge(edge);
                        redrawEdges = true;

                    }
                }

            },
            mouseDown: function (obj, event) {
                /// <param name="event" type="MouseEvent">clickEvent</param>
                if (obj != null && obj.type == "hull") {
                    if (event.button == 2) { //right mouse button to start scaling
                        selectedHull = obj;
                    }
                }
            },
            mouseUp: function (obj, event) {
                if (event.button == 2) {
                    selectedHull = null;

                }
            }
        });
        document.addEventListener("mousemove", scaleHandler);
        document.body.appendChild(renderer.domElement);

        // Stats.js
        if (that.show_stats) {
            stats = new Stats();
            stats.domElement.style.position = 'absolute';
            stats.domElement.style.top = '0px';
            document.body.appendChild(stats.domElement);
        }

        // Create info box
        if (that.show_info) {
            var info = document.createElement("div");
            var id_attr = document.createAttribute("id");
            id_attr.nodeValue = "graph-info";
            info.setAttributeNode(id_attr);
            document.body.appendChild(info);
        }
    }


    /**
     *  Creates a graph with random nodes and edges.
     *  Number of nodes and edges can be set with
     *  numNodes and numEdges.
     */
    function createGraph() {
        var node = new Node(0);
        node.position.x = node.position.y = node.position.z = 0;
        node.data.title = "This is node " + node.id;
        graph.addNode(node);
        drawNode(node);
        selectableContainer = node.data.draw_object;
        //nodes.push(node);
    }


    /**
     *  Create a node object and add it to the scene.
     */
    function drawNode(node, parentObject) {
        parentObject = parentObject || scene;
        var draw_object = new THREE.Mesh(geometry, new THREE.MeshBasicMaterial({ color: 0x0000ff, opacity: 0.5 }));
        if (that.show_labels) {
            if (node.data.title != undefined) {
                var label_object = new THREE.Label(node.data.title);
            } else {
                var label_object = new THREE.Label(node.id);
            }
            node.data.label_object = label_object;
            scene.add(node.data.label_object);
        }
        draw_object.nodeID = node.id;
        draw_object.type = "node";

        var hullGeometry = new THREE.SphereGeometry(100, 20, 20, 0, 2 * Math.PI, 0, 2 * Math.PI);
        var hull = new THREE.Mesh(hullGeometry, new THREE.MeshBasicMaterial({ color: 0xff00ff, opacity: 0.1, transparent: true }));
        hull.type = "hull";
        hull.position = new THREE.Vector3(0, 0, 0);
        hull.nodeID = node.id;
        node.data.hullDrawObject = hull;
        node.data.draw_object = draw_object;
        draw_object.position = new THREE.Vector3(node.position.x, node.position.y, node.position.z);
        //        draw_object.position.sub(parentObject.position);
        var position = new THREE.Vector3();
        var quaternion = new THREE.Quaternion();
        var scale = new THREE.Vector3();
        parentObject.matrixWorld.decompose(position, quaternion, scale);
        draw_object.position = parentObject.worldToLocal(draw_object.position);
        draw_object.scale = new THREE.Vector3(1 / scale.x, 1 / scale.y, 1 / scale.z);
        parentObject.add(node.data.draw_object);
        //

    }


    /**
     *  Create an edge object (line) and add it to the scene.
     */
    function drawEdge(edge) {
        source = edge.source.data.draw_object.position.clone();
        target = edge.target.data.draw_object.position.clone();
        source.applyMatrix4(edge.source.data.draw_object.parent.matrixWorld);
        target.applyMatrix4(edge.target.data.draw_object.parent.matrixWorld);

        var controlPoint1 = source.clone();
        var controlPoint2 = target.clone();
        deltax = Math.abs(source.x - target.x);
        deltay = Math.abs(source.y - target.y);
        deltaz = Math.abs(source.z - target.z);
        material = new THREE.MeshBasicMaterial({ color: 0xff0000, opacity: 1, linewidth: 50 });
        if (deltax > deltay && deltax > deltaz) {
            controlPoint1.x = target.x;
            controlPoint2.x = source.x;
        }
        if (deltaz > deltay && deltaz > deltay) {
            controlPoint1.z = target.z;
            controlPoint2.z = source.z;
        }
        if (deltay > deltaz && deltay > deltax) {
            controlPoint1.z = target.z;
            controlPoint2.z = source.z;
        }
        var curve = new THREE.CubicBezierCurve3(source, controlPoint1, controlPoint2, target);
        var geometry = new THREE.Geometry();
        geometry.vertices = curve.getPoints(20);
        edge.data.drawObject = new THREE.Object3D();
        for (var i = 0; i < geometry.vertices.length-1; i++) {
            direction = geometry.vertices[i].clone().sub(geometry.vertices[i + 1]);
            height = direction.length();
            var segment = new THREE.CylinderGeometry(50 / i, 50/ (i + 1), height, 10, 1);
            cylinder = new THREE.Mesh(segment, material);
            cylinder.position = geometry.vertices[i];
            var focalPoint = new THREE.Vector3(
                cylinder.position.x + direction.x,
                cylinder.position.y + direction.y,
                cylinder.position.z + direction.z
            ); 
            cylinder.lookAt(focalPoint);
            cylinder.rotateX(Math.PI/2);
            edge.data.drawObject.add(cylinder);
        }                            

        line = new THREE.Line(geometry, material);
        line.scale.x = line.scale.y = line.scale.z = 1;
        line.originalScale = 1;
        line.type = "line";
        edges.add(edge.data.drawObject);
    }
    function animate() {
        requestAnimationFrame(animate);
        controls.update();
        render();
        if (that.show_info) {
            printInfo();
        }
    }


    function render() {
        // Generate layout if not finished
        if (redrawEdges) {
            redrawEdges = false;
            scene.remove(edges);
            edges = new THREE.Object3D();
            for (var i = 0; i < graph.edges.length; i++) {
                drawEdge(graph.edges[i]);
            }
            scene.add(edges);
        }
        // render selection
        if (that.selection) {
            object_selection.render(selectableContainer, camera);
        }

        // update stats
        if (that.show_stats) {
            stats.update();
        }

        // render scene
        try {
            renderer.render(scene, camera);
        }
        catch (e) {
            debugger;
        }
    }

    /**
     *  Prints info from the attribute info_text.
     */
    function printInfo(text) {
        var str = '';
        for (var index in info_text) {
            if (str != '' && info_text[index] != '') {
                str += " - ";
            }
            str += info_text[index];
        }
        document.getElementById("graph-info").innerHTML = str;
    }

    // Generate random number
    function randomFromTo(from, to) {
        return Math.floor(Math.random() * (to - from + 1) + from);
    }

    // Stop layout calculation
    function scaleHandler(event) {
        a = new THREE.Vector3();
        a.clone();
        if (selectedHull && !controls.enabled) { // to make sure the camera controls are not enabled when scaling the hull
            diff = event.movementX * 0.01;
            selectedHull.scale.add(new THREE.Vector3(diff, diff, diff));

            var absoluteScale = new THREE.Vector3(),
                parentAbsoulteScale = new THREE.Vector3();
            selectedHull.matrixWorld.decompose(new THREE.Vector3(), new THREE.Quaternion(), absoluteScale);
            selectedHull.parent.parent.matrixWorld.decompose(new THREE.Vector3(), new THREE.Quaternion(), parentAbsoulteScale);
            if (selectedHull.parent.parent.type == "hull" &&
                parentAbsoulteScale.multiplyScalar(.5).length() < absoluteScale.length()) {
                selectedHull.parent.parent.scale.add(new THREE.Vector3(diff , diff, diff ));
                children = selectedHull.parent.parent.children;
                for (var i = 0; i < children.length; i++) {
                    children[i].scale = new THREE.Vector3(1 / selectedHull.scale.x, 1 / 1 / selectedHull.scale.y, 1 / 1 / selectedHull.scale.z);
                }
                //selectedHull.scale.add(new THREE.Vector3(diff, diff, diff));

            }

            if (children = selectedHull.children) {
                redrawEdges = true;
            }
            for (var i = 0; i < children.length; i++) {
                children[i].scale = new THREE.Vector3(1 / selectedHull.scale.x, 1 / 1 / selectedHull.scale.y, 1 / 1 / selectedHull.scale.z);
            }
        }
    }
    function initializeLineMaterial() {
        that.lineMaterial = new THREE.ShaderMaterial({
            uniforms: {

            },
            vertexShader: that.lineVertex,
            fragmentShader: that.lineFrag,
            side: THREE.FrontSide
        });
        }
}
