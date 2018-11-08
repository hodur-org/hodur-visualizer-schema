// This function is called to update the tooltip information
// depending on the bound data of the Node that is closest to the pointer.
function updateInfoBox(mousePt, data) {
  var box = document.getElementById("infoBoxHolder");
  box.innerHTML = "";
  var infobox = document.createElement("div");
    infobox.id = "infoBox";
    box.appendChild(infobox);
    var header = document.createElement("div");
    header.textContent = data.key || data.name;
    infobox.appendChild(header);

    if (data.tags) {
      for (var i = 0; i < data.tags.length; i++) {
        var row = document.createElement("div");
        row.className = "infoRow";

        var tag = data.tags[i];
        var childTitle = document.createElement("div");
        childTitle.className = "infoTitle";
        childTitle.textContent = tag.key;
        row.appendChild(childTitle);

        var childValue = document.createElement("div");
        childValue.className = "infoValue";
        childValue.textContent = tag.value;
        row.appendChild(childValue);
        infobox.appendChild(row);
      }
    }

    box.style.left = mousePt.x + 30 + "px";
    box.style.top = mousePt.y + 20 + "px";
}

// Called when the mouse is over the diagram's background
function doMouseOver(e) {
  if (e === undefined) e = myDiagram.lastInput;
  var doc = e.documentPoint;
  // find all Nodes that are within 100 units
  var list = myDiagram.findObjectsNear(doc, 100, null, function(x) { return x instanceof go.Node; });
  // now find the one that is closest to e.documentPoint
  var closest = null;
  var closestDist = 100;
  list.each(function(node) {
    var dist = doc.distanceSquaredPoint(node.getDocumentPoint(go.Spot.Center));
    if (dist < closestDist) {
      closestDist = dist;
      closest = node;
    }
  });
  showToolTip(closest, myDiagram);
}

// Called with a Node (or null) that the mouse is over or near
function showToolTip(obj, diagram) {
  if (obj !== null) {
    var node = obj.part;
    var e = diagram.lastInput;

    var elements = node.findObject("LIST").elements;
    var doc = e.documentPoint;
    // now find the one that is closest to e.documentPoint
    var closest = null;
    var closestDist = 999999999;
    elements.each(function(e) {
      var dist = doc.distanceSquaredPoint(e.getDocumentPoint(go.Spot.Center));
      if (dist < closestDist) {
        closestDist = dist;
        closest = e;
      }
    });
    // the mouse maybe closer to the header of the node
    if (doc.distanceSquaredPoint(node.getDocumentPoint(go.Spot.TopCenter)) < closestDist) {
      closest = node;
    }
    updateInfoBox(e.viewPoint, closest.data);
  } else {
    document.getElementById("infoBoxHolder").innerHTML = "";
  }
}

function init() {

  var $ = go.GraphObject.make;  // for conciseness in defining templates

  var myToolTip = $(go.HTMLInfo, {
    show: showToolTip,
    // do nothing on hide: This tooltip doesn't hide unless the mouse leaves the diagram
  });
  
  myDiagram =
    $(go.Diagram, "myDiagramDiv",  // must name or refer to the DIV HTML element
      {
        initialContentAlignment: go.Spot.Center,
        allowDelete: false,
        allowCopy: false,
        layout: $(go.ForceDirectedLayout),
        "undoManager.isEnabled": true,
        mouseOver: doMouseOver
      });

  // define several shared Brushes
  var bluegrad = $(go.Brush, "Linear", { 0: "rgb(150, 150, 250)", 0.5: "rgb(86, 86, 186)", 1: "rgb(86, 86, 186)" });
  var greengrad = $(go.Brush, "Linear", { 0: "rgb(158, 209, 159)", 1: "rgb(67, 101, 56)" });
  var redgrad = $(go.Brush, "Linear", { 0: "rgb(206, 106, 100)", 1: "rgb(180, 56, 50)" });
  var yellowgrad = $(go.Brush, "Linear", { 0: "rgb(254, 221, 50)", 1: "rgb(254, 182, 50)" });
  var lightgrad = $(go.Brush, "Linear", { 1: "#E6E6FA", 0: "#FFFAF0" });

  // the template for each attribute in a node's array of item data
  var itemTempl =
      $(go.Panel, "Horizontal",
        $(go.Shape,
          { desiredSize: new go.Size(10, 10) },
          new go.Binding("figure", "figure"),
          new go.Binding("fill", "color")),
        $(go.TextBlock,
          { stroke: "#333333",
            font: "14px arial" },
          new go.Binding("text", "name"))
       );

  // define the Node template, representing an entity
  myDiagram.nodeTemplate =
    $(go.Node, "Auto",  // the whole node panel
      { selectionAdorned: true,
        resizable: false,
        layoutConditions: go.Part.LayoutStandard & ~go.Part.LayoutNodeSized,
        fromSpot: go.Spot.AllSides,
        toSpot: go.Spot.AllSides,
        isShadowed: false,
        toolTip: myToolTip,
        // isAnimated: false
      },
      new go.Binding("location", "location").makeTwoWay(),
      // whenever the PanelExpanderButton changes the visible property of the "LIST" panel,
      // clear out any desiredSize set by the ResizingTool.
      new go.Binding("desiredSize", "visible", function(v) { return new go.Size(NaN, NaN); }).ofObject("LIST"),
      // define the node's outer shape, which will surround the Table
      $(go.Shape, "Rectangle",
        { fill: "#FFFFFF", stroke: "#756875", strokeWidth: 2 }),
      $(go.Panel, "Table",
        { margin: 8, stretch: go.GraphObject.Fill },
        $(go.RowColumnDefinition, { row: 0, sizing: go.RowColumnDefinition.None }),
        // the table header
        $(go.TextBlock,
          {
            row: 0, alignment: go.Spot.Center,
            margin: new go.Margin(0, 14, 0, 2),  // leave room for Button
            font: "14px arial"
          },
          new go.Binding("text", "qualifier")),
        $(go.TextBlock,
          {
            alignment: go.Spot.Center,
            margin: new go.Margin(0, 14, 0, 2),  // leave room for Button
            font: "bold 16px arial"
          },
          new go.Binding("text", "key"),
          new go.Binding("row", "nameRow")),
        // the collapse/expand button
        $("PanelExpanderButton", "LIST",  // the name of the element whose visibility this button toggles
          { alignment: go.Spot.TopRight },
          new go.Binding("row", "nameRow")),
        // the list of Panels, each showing an attribute
        $(go.Panel, "Vertical",
          {
            name: "LIST",
            padding: 3,
            alignment: go.Spot.TopLeft,
            defaultAlignment: go.Spot.Left,
            stretch: go.GraphObject.Horizontal,
            itemTemplate: itemTempl
          },
          new go.Binding("itemArray", "items"),
          new go.Binding("row", "fieldsRow"))
       )  // end Table Panel
     );  // end Node

  // define the Link template, representing a relationship
  myDiagram.linkTemplate =
    $(go.Link,  // the whole link panel
      {
        selectionAdorned: true,
        layerName: "Foreground",
        reshapable: true,
        routing: go.Link.AvoidsNodes,
        corner: 5,
        curve: go.Link.JumpOver
      },
      $(go.Shape,  // the link shape
        { stroke: "#303B45", strokeWidth: 2},
        new go.Binding("strokeDashArray", "strokeDashArray")),
      $(go.TextBlock,  // the "from" label
        {
          textAlign: "center",
          font: "bold 14px sans-serif",
          stroke: "#1967B3",
          segmentIndex: 0,
          segmentOffset: new go.Point(NaN, NaN),
          segmentOrientation: go.Link.OrientUpright
        },
        new go.Binding("text", "text")),
      $(go.Shape, // the arrow on the "to" side
        { scale: 1.5, fill: "#FFFFFF" },
        new go.Binding("toArrow", "toArrow")),
      $(go.TextBlock,  // the "to" label
        {
          textAlign: "center",
          font: "bold 14px sans-serif",
          stroke: "#1967B3",
          segmentIndex: -1,
          segmentOffset: new go.Point(NaN, NaN),
          segmentOrientation: go.Link.OrientUpright
        },
        new go.Binding("text", "toText"))
     );

  // create the model for the E-R diagram
  var nodeDataArray = [
    { key: "Products",
      items: [ { name: "ProductID", iskey: true, figure: "Decision", color: yellowgrad },
               { name: "ProductName", iskey: false, figure: "Cube1", color: bluegrad },
               { name: "SupplierID", iskey: false, figure: "Decision", color: "purple" },
               { name: "CategoryID", iskey: false, figure: "Decision", color: "purple" } ] },
    { key: "Suppliers",
      items: [ { name: "SupplierID", iskey: true, figure: "Decision", color: yellowgrad },
               { name: "CompanyName", iskey: false, figure: "Cube1", color: bluegrad },
               { name: "ContactName", iskey: false, figure: "Cube1", color: bluegrad },
               { name: "Address", iskey: false, figure: "Cube1", color: bluegrad } ] },
    { key: "Categories",
      items: [ { name: "CategoryID", iskey: true, figure: "Decision", color: yellowgrad },
               { name: "CategoryName", iskey: false, figure: "Cube1", color: bluegrad },
               { name: "Description", iskey: false, figure: "Cube1", color: bluegrad },
               { name: "Picture", iskey: false, figure: "TriangleUp", color: redgrad } ] },
    { key: "Order Details",
      items: [ { name: "OrderID", iskey: true, figure: "Decision", color: yellowgrad },
               { name: "ProductID", iskey: true, figure: "Decision", color: yellowgrad },
               { name: "UnitPrice", iskey: false, figure: "MagneticData", color: greengrad },
               { name: "Quantity", iskey: false, figure: "MagneticData", color: greengrad },
               { name: "Discount", iskey: false, figure: "MagneticData", color: greengrad } ] },
    { key: "Order Details2",
      tags: [{ key: ":datomic/asd", value: "false" },
             { key: ":datomic/bla", value: "true" },
             { key: ":datomic/qwe", value: "true" }],
      items: [ { name: "OrderID", iskey: true, figure: "Decision", color: yellowgrad,
                 tags: [{ key: ":datomic/tag", value: "true" },
                        { key: ":datomic/bla", value: "true" },
                        { key: ":datomic/qwe", value: "true" }] },
               { name: "ProductID", iskey: true, figure: "Decision", color: yellowgrad,
                 tags: [{ key: ":datomic/tag", value: "true" },
                        { key: ":datomic/bla", value: "true" },
                        { key: ":datomic/qwe", value: "true" }]},
               { name: "UnitPrice", iskey: false, figure: "MagneticData", color: greengrad,
                 tags: [{ key: ":datomic/tag", value: "true" },
                        { key: ":datomic/bla", value: "true" },
                        { key: ":datomic/qwe", value: "true" }]},
               { name: "Quantity", iskey: false, figure: "MagneticData", color: greengrad,
                 tags: [{ key: ":datomic/tag", value: "true" },
                        { key: ":datomic/bla", value: "very long description that might span across several lines" },
                        { key: ":datomic/qwe", value: "true" }]},
               { name: "Discount", iskey: false, figure: "MagneticData", color: greengrad ,
                 tags: [{ key: ":datomic/tag", value: "true" },
                        { key: ":datomic/bla", value: "true" },
                        { key: ":datomic/qwe", value: "true" }]} ] }
  ];
  var linkDataArray = [
    { from: "Products", to: "Suppliers", text: "0..N", toText: "1" },
    { from: "Products", to: "Categories", text: "0..N", toText: "1" },
    { from: "Order Details", to: "Products", text: "0..N", toText: "1" }
  ];
  //myDiagram.model = new go.GraphLinksModel(nodeDataArray, linkDataArray);

  hodur.hodur_visualizer.set_model();
}
