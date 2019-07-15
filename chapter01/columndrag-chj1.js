"use strict"

function ColumnDrag(id) {
    this.tbl = document.getElementById(id);
    if (this.tbl && this.tbl.nodeName == "TABLE") {
        this.state = null;
        this.prevX = null;
        this.cols = this.tbl.getElementsByTagName("col");
        this.makeDraggable();
    }
}

ColumnDrag.prototype.makeDraggable = function () {
    // Add trailing text node for IE
    for (var i=0; this.tbl.rows[i]; i++) {
        var td = document.createElement("td");
            td.style.display = "none";
        this.tbl.rows[i].appendChild(td);
    }
    
    var cgobj = this; // cg: column-drag
       
    // Wire up headings
    var headings = this.tbl.tHead.rows[0].cells;
    for (var i=0; headings[i]; i++) {
        headings[i].cIdx = i; // Safari 2.0.4 "cellIndex always equals 0" workaround
        
        var a = document.createElement("a");
            a.href = "#";
            a.innerHTML = "&larr; " + headings[i].innerHTML + " &rarr;";
            a.onclick = function () {
                return false;
            }
        
        headings[i].className += " draggable";
        
        // mousedown 事件回调是安插在 <th> 元素上的, 因此每个 <th> 都安插了一份回调函数实例.
        headings[i].onmousedown = function (e) { // e means event
            cgobj.mousedown(e);
            return false;
        };
        // 注意: 下头三个鼠标事件是安插在全局 document 上的. 因此, 一个<table>只有一份 onmousemove 回调实例.
        document.onmousemove = function (e) {
        	// 此处 this 指向 document, 但我们此处并不需要用到 this .
            cgobj.mousemove(e);
            return false;
        };
        document.onmouseup = function () {
            var e = cgobj.clearAllHeadings();
            if (1) //(e) 
            	cgobj.mouseup(e);
            else
            	console.log("Mouseup missing!!");
        };
        document.onmouseout = function (e) {
            // [2019-07-15] 此事件处理看起来并无必要. 原作者担心的可能是: 用户在 <th> 上按下鼠标,
            // 开始拖动, 然后故意在浏览器 viewport 之外释放鼠标, 结果导致 .mouseup() 没有被回调.
            // 但今天在 Windows Chrome 75 上看, viewport 内按下鼠标, viewport 之外放开, Chrome 是
            // 会回调 .mouseup() 的, 说明 Chrome 内部自动调用了 WinAPI SetCapture() .
            
            e = e ? e : window.event;
            var related = e.relatedTarget ? e.relatedTarget : e.toElement;
            if (related == null) {
            	// 当鼠标移出 viewport 时, 会发生此情形.
            	// 不过, 有时鼠标从 viewport 外部移入 viewport, 也会发生, 这个比较困惑.
            	console.log("mouseout with .relatedTarget==null"); // debug
                var e = cgobj.clearAllHeadings();
                if (e) 
                	cgobj.mouseup(e);
            }
        };
        a.onkeyup = function (e) {
            cgobj.keyup(e);
            return false;
        };
        headings[i].onmouseover = addHover;
        headings[i].onmouseout = removeHover;

        headings[i].innerHTML = "";
        headings[i].appendChild(a);

    }
}

ColumnDrag.prototype.clearAllHeadings = function (){
	var e = false;
    for (var i=0; this.cols[i]; i++) {
        var th = this.tbl.tHead.rows[0].cells[i];
        if (th.className.match(/down/)) {
            e = {target: th};
        }
    }
    return e;
}

ColumnDrag.prototype.mousedown = function (e) {
    e = e ? e : window.event;
    var elm = e.target? e.target : e.srcElement;
    var elm_a = elm;
    elm = elm.nodeName == "A" ? elm.parentNode : elm; // elm 将指向 <th>
    
    // set state and clicked "from" element
//console.log(".mouse-down");
    this.state = "drag";
    elm.className += " down";
    this.cols[elm.cIdx].className = "drag";
    this.from = elm; 
    this.from_a = elm_a; // Chj add. `this.from_a` will be compared with <a> in .mousemove()
    operaRefresh();
}

ColumnDrag.prototype.mousemove = function (e) {
	
	// 按设计, this 指向一个 ColumnDrag 对象, 每个 ColumnDrag 对象关联着一个 <table> .
	
    e = e ? e : window.event;
    var x = e.clientX ? e.clientX : e.pageX;  // .clientX is a MouseEvent property
    var elm = e.target? e.target : e.srcElement; // elm 是触发元素, 某个 <a>

	// 概述: 假设我们刚才启动了 Q3 的拖动, 那么, 当鼠标指针离开 Q3 当前的占地时, column-move 代码就应该行动了.
	// 这个思路好, 不需要我们自己判断鼠标的 x,y 坐标值.

    if (this.state == "drag" && elm != this.from_a) { // elm!=this.from_a 意味着离开了 Q3 自己的占地
        var from = this.from.cIdx;
        var to = elm.cIdx; // `undefined` if dragging out of boundary
        
        if (
        	from!==undefined && to!==undefined && // Chj fix here
        	( e.fromKeyboard || (x>this.prevX && to>from) || (x<this.prevX && to<from) )  // see book p34 ③ explanation
        	) 
        { 
            
            // highlight column
            this.cols[from].className = "";
            this.cols[to].className = "drag"; // #eee 深灰色
            
            // increase 'to' by one if direction is positive because we're inserting 'before' 
            // and so we have to refer to the target columns neighbor
            if (from < to) 
            	to++; // 下头 to 的含义已经变了, 最好是新起一个变量名
            
            // shift all cells belonging to head
            var rows = this.tbl.rows;
            for (var i=0; rows[i]; i++) {
                rows[i].insertBefore(rows[i].cells[from], rows[i].cells[to]); // 将 from 插到 to 的前头(左侧)
            }
			
            // update cIdx value (fix for Safari 2.0.4 "cellIndex always equals 0" bug)
            var headings  = this.tbl.tHead.rows[0].cells;
            for (var i=0; headings[i]; i++) {
	            headings[i].cIdx = i;
            }
        }
    }
	this.prevX = x;
}

ColumnDrag.prototype.mouseup = function (e) {
    e = e ? e : window.event;
    var elm = e.target? e.target : e.srcElement;
    elm = elm.nodeName == "A" ? elm.parentNode : elm;

    this.state = null;
//console.log(".mouseup");   
    var col = this.cols[elm.cIdx];
    col.className = "dropped";
    operaRefresh();
    var that = this;  // points to a ColumnDrag object
    window.setTimeout(function () {
        that.from.className = that.from.className.replace(/ down/g, "");
        for (var i=0; that.cols[i]; i++) {
            that.cols[i].className = ""; // loop over all cols to avoid odd sized column conflicts
        }
	    operaRefresh();
    }, 1000);
}

ColumnDrag.prototype.keyup = function (e) {
    e = e ? e : window.event;
    var elm = e.target ? e.target : e.srcElement;
    var a = elm;
    var elm_a = a;
    elm = elm.parentNode;
    var headings = this.tbl.tHead.rows[0].cells;

    switch (e.keyCode){
        case 37: // left
            this.mousedown({target:elm_a});
            
            var prevCellIdx = elm.cIdx == 0 ? 0 : elm.cIdx - 1;
//          this.prevX = 2;
            this.mousemove(
                {
                    target: headings[prevCellIdx],
//                  clientX: 1,
                    fromKeyboard : true,
                }
            );
            
            this.mouseup({target: elm_a});
            
            a.focus(); // window.focus() 给当前这个<a>设上焦点外观
        break;
        case 39: // right
            this.mousedown({target:elm_a});
            
            // -2 for IE fix phantom TDs
            var nextCellIdx = elm.cIdx == headings.length-2 ? headings.length-2 : elm.cIdx + 1;
//          this.prevX = 0;
            
            this.mousemove(
                {
                    target: headings[nextCellIdx],
//                  clientX: 1,
                    fromKeyboard: true,
                }
            );
            this.mouseup({target: elm_a});
            
            a.focus();
        break;
    }
}

function addHover () {
    this.className += " hover";
}

function removeHover () {
    this.className = this.className.replace(/ hover/, "");
}

function operaRefresh() {
   document.body.style.position = "relative";
   document.body.style.position = "static";
}