/* -------------------------------------------- */
"use strict";

const chrsSum = 3088269832;
const chrs = {
	'chr1': 248956422,  'chr2':  242193529, 'chr3': 198295559, 
	'chr4': 190214555,  'chr5':  181538259, 'chr6': 170805979, 
	'chr7': 159345973,  'chr8':  145138636, 'chr9': 138394717, 
	'chr10': 133797422, 'chr11': 135086622, 'chr12': 133275309, 
	'chr13': 114364328, 'chr14': 107043718, 'chr15': 101991189, 
	'chr16': 90338345,  'chr17': 83257441,  'chr18': 80373285, 
	'chr19': 58617616,  'chr20': 64444167,  'chr21': 46709983, 
	'chr22': 50818468,  'chrX':  156040895, 'chrY': 57227415
};

// Experiment ID 
// (if specified, need to load samples of this experiment)
var expID = '';
// Experiment Samples Data
var expData = {}, Group = {};
var expName = [];
// Page container
var doc = $('#content')[0];

// Cache for imagedata
var cache = {'hm' : {}};
// Samples filter: checkboxes
var visibleType = 0;
var visibleMode = 0;
var mode = 0;
/* -------------------------------------------- */

const density_len = {
	'chr1': 125,	'chr2': 122,	'chr3': 100,
	'chr4': 96,	'chr5': 91, 	'chr6': 86,
	'chr7': 80,	'chr8': 73,	'chr9': 70,
	'chr10': 67,	'chr11': 68,	'chr12': 67,
	'chr13': 58,	'chr14': 54,	'chr15': 51,
	'chr16': 46,	'chr17': 42,	'chr18': 41,
	'chr19': 30,	'chr20': 33,	'chr21': 24,
	'chr22': 26,	'chrX': 79,	'chrY': 29
};

const TE_type = ["Alu", "Line", "Others"];
var file_list = [], id_list = {}, group_list = [], n_group = 0;
var n_file = 0;
var density_map = {}, d_max = 0, g_density = {}, g_max;
var tree = [];
var color = ["grey", "green", "red", "blue"];
var ora = [0,1];
/* -------------------------------------------- */
/* Functions */

// The template. Obtaining a template name and pasting data
var Template = (function(classname){
	var templates = {};
	$(classname).each(function(){
		templates[$(this).data('name')] = $(this).html();
	});
	return function(name, data){
		var html = templates[name];
		for (var e in data){
			var find = new RegExp("{" + e + "}", "g");
			html = html.replace(find, data[e] == undefined ? '' : data[e]);
		}
		return html;
	}
}('.template'));

// Actions log
function MuteMessage(txt){
	$('body > *').addClass('blur');
	$('body').append( Template('message', {txt : txt}) );
}
function MessageClose(){
	$('.blur').removeClass('blur');
	$('.background').fadeOut(300, function(){ $(this).remove() });
}

// Routing based on location.hash
function Route(loc){
	if (loc) location.hash = loc + (expID ? ('/' + expID) : '');
	disable_button();

	// Show one chromosome
	var chr = location.hash.match(/^\#?(chr[0-9XY]+)\:([0-9]+)\-([0-9]+)\/?([0-9a-z]+)?$/);
	if (chr) {
		var obj = getBwtWeb('svgHolderT0');
 		obj.search(chr[1].substr(3)+ ":" + parseInt(chr[2]) + ".." + parseInt(chr[3]), function(err) {});

		return ShowChromosome(chr[1], parseInt(chr[2]), parseInt(chr[3]));
	}
	// Show chromosome list
	return ShowAsLine();
}

// Sort of retrotransposons in the order on the chromosome
function SamplesLoaded(){
	// Clear cache
	cache = {'hm' : {}};

	// Reset all
	$('.clear').click(function(){
		location.hash = '#general';
		location.reload();
	});

	// View mode
	$('.chr-view-mode .aslist').click(function(){Route("chr1:5000000-10000000");});
	$('.chr-view-mode .asline').click(function(){Route('#general');});

	$("#find").keyup(function(e) {
   		if (e.keyCode == 13) {
			var loc = $(this).val();
			// Show one chromosome
			var chr = loc.match(/^\#?(chr[0-9XY]+)\:([0-9]+)\-([0-9]+)\/?([0-9a-z]+)?$/);
			if (chr) {
				disable_button();
				var start = parseInt(chr[2]);
				var end = parseInt(chr[3]);
				if (end < start + 50) end = start + 50;
				var obj = getBwtWeb('svgHolderT0');
 				obj.search(chr[1].substr(3)+ ":" + start + ".." + end, function(err) {});
				return ShowChromosome(chr[1], start, end);
			} else {
				$(this).val('').attr("placeholder","Try again with search format. Ex: chr1:1000-5000000");
			}
		}
	});

	// Comparision window
	$('.comparision .txt').html(n_group == 0 ? 'Group compare' : 'qwe');
	$('.comparision').click(function(){
		if (n_group == 0){
			split_group();
		} else {
			delete_group();
		}
	});

	$('.showtree').click(function(){
		Modal({ class : 'tree-dialog', data : '<div class="tree"></div>', title : 'Phylogenetic tree'})
		draw_tree();
	});

	$('.type').click(function(e){
		$('.type').removeClass('glyphicon glyphicon-ok')
		$(this).addClass('glyphicon glyphicon-ok');
		visibleType = $(this).data('map');

		Route();
	});
	$('.mode').click(function(){
		$('.mode').removeClass('glyphicon glyphicon-ok')
		$(this).addClass('glyphicon glyphicon-ok');
		visibleMode = $(this).data('map');

		Route();
	});

	// Samples uploader
	$('#load').bootstrapFileInput();
	$('#load').change(function(e){
		if (n_group > 0)
			delete_group();
		var fs = e.target.files;
		var ftotal = fs.length, itr = fs.length;
		if (ftotal > 0)  $(".status").css("visibility", "visible").html("Loading files...");
		for (var i = 0; i < fs.length; i++) { (function(f){
			var reader = new FileReader();
			reader.onload = function() {
				itr--;
				Parse(this.result, f.name);
				if (itr == 0) {
					get_max();
					if (n_file > 1)
						get_common();

					if (n_file > 2){
						contruct_tree();
						$(".status").html("Contructing tree...");
					}
					Route();
				}
			};
			reader.readAsText(f);
		})(fs[i]); }
	});

	// Open Samples Library
	$('.library-open').click(function(e){
		Modal({
			'title' : 'Samples Library',
			'data'  : Template('library'),
			'class' : 'library'
		});
		// Loaded
		expName.map(function(name){
			$('.library li.selected').removeClass('selected');
			$('[data-name="'+name+'"]').addClass('loaded');
		});

		// Check on/off
		$('.library li:not(.loaded)').click(function(){
			$(this)[$(this).hasClass('selected') ? 'removeClass' : 'addClass']('selected');
		});

		// Loading
		$('.get-samples').click(function(){
			$(".status").css("visibility", "visible").html("Loading files...");
			$(this).addClass('disabled').html('Loading...')
			var samples = [];
			$('.library li.selected').each(function(){
				samples.push($(this).data('name'));
				expName.push($(this).data('name'));
				$('[data-name="'+name+'"]').addClass('loaded');
			});
			get_server_file(samples)
			$('#modal').modal('hide');
		});
	});

	$('.chr-btn a').click(function(){
		var chr = location.hash.match(/^\#?(chr[0-9XY]+)\:([0-9]+)\-([0-9]+)\/?([0-9a-z]+)?$/);
		var name = $(this).data('map');
		var obj = getBwtWeb('svgHolderT0');
 		obj.search(name.substr(3)+ ":" + parseInt(chr[2]) + ".." + parseInt(chr[3]), function(err) {});

		return ShowChromosome(name, parseInt(chr[2]), parseInt(chr[3]));
	});

	// Buttons:
	$('.move-c a.cnt').click(function(){
		var inc = parseFloat($(this).data('e'));
		var name = $(".list_name").text().toLowerCase();
		var p = inc * (ora[1] - ora[0]);
		var x1 = ora[0] + p, x2 = ora[1] + p;
		if (x1 <  0) { x1 = 0; x2 = ora[1] - ora[0]; }
		if (x2 > chrs[name]) { x2 = chrs[name]; x1 = chrs[name] - ora[1] + ora[0]; }
		var obj = getBwtWeb('svgHolderT0');
 		obj.search(name.substr(3)+ ":" + x1 + ".." + x2, function(err) {});

		ShowChromosome(name, x1, x2);
	});

	$('.zoom-c a.cnt').click(function(){
		var inc = parseFloat($(this).data('e'));
		var name = $(".list_name").text().toLowerCase();
		var cen = (ora[1] + ora[0])/2;
		var upg = inc * (ora[1] - ora[0]) / 2;
		if (upg < 50) upg = 50;
		var x1 = cen - upg, x2 = cen + upg;
		if (x1 < 0) x1 = 0;
		if (x2 > chrs[name]) x2 = chrs[name];
		var obj = getBwtWeb('svgHolderT0');
 		obj.search(name.substr(3)+ ":" + x1 + ".." + x2, function(err) {});

		ShowChromosome(name, x1, x2);
	});

}

function disable_button(){
	// Disable some function when number of file is lower than needed
	if (n_file < 2)
		$('.comparision').addClass("disabled");
 	else
		$('.comparision').removeClass("disabled");
	if (n_file <= 2)
		$('.showtree').addClass("disabled");
	else
		$('.showtree').removeClass("disabled");

	if (location.hash == "#general"){
		$('.chr-view-mode a').removeClass('disabled');
		$('.chr-view-mode .asline').addClass('disabled');
		$('.move-c').attr("style", "visibility:hidden");
		$('.zoom-c').attr("style", "visibility:hidden");
	} else {
		$('.chr-view-mode a').addClass('disabled');
		$('.chr-view-mode .asline').removeClass('disabled');
		$('.move-c').attr("style", "visibility:visible");
		$('.zoom-c').attr("style", "visibility:visible");
	}
}

// Getting heatmap pictures for chromosome
function SamplesHM(chr){
	if (!expData[chr]) return ;
	var width = $('.' + chr).width() + 2; // +2 is border
	var height = Object.keys(expData[chr]).length * 10;
	
	if (!(chr in cache.hm)){
		var canvas = document.createElement('canvas');
		canvas.width = width;
		canvas.height = height;
		var ctx = canvas.getContext('2d');
		var cdt = ctx.getImageData(0, 0, width, height);	
		var Pixel = function(x,y,color,a){
			var ind = (y * width + x) * 4;
			cdt.data[ind + 0] = color[0]; // R
			cdt.data[ind + 1] = color[1]; // G
			cdt.data[ind + 2] = color[2]; // B
			cdt.data[ind + 3] = a; // A
		};
		var y = 0;
		var K = width/chrs[chr];
		var colors = [[220,0,0],[0,220,0],[0,0,220]];
		for (var f in expData[chr]) {
			expData[chr][f].map(function(sm){
				if (!visibleType[sm[2]]) return;
				var col = colors[sm[2]-1], 
					xx = Math.floor(K * sm[0]), 
					yy = y + parseInt(sm[2]-1) * 3;
				Pixel(xx, yy+0, col, 255);
				Pixel(xx, yy+1, col, 255);
				Pixel(xx, yy+2, col, 255);
				Pixel(xx+1, yy+0, col, 95);
				Pixel(xx+1, yy+1, col, 95);
				Pixel(xx+1, yy+2, col, 95);
			});
			y += 10;
		}
		ctx.putImageData(cdt, 0, 0);
		cache.hm[chr] = canvas.toDataURL();
	}
	
	$('.' + chr).append(Template('hm', {
		image : cache.hm[chr],
		height : height,
		samples : Object.keys(expData[chr]).map(function(f){
			return '<div class="fn"><span>'+f.split('.').slice(0,-1).join('.')+'</span></div>';
		}).join('')
	}));
}

// Parse samples files. Separators: Col: "\t", Row: "\n"
function Parse(content, filename){
	for (var i in file_list)
		if (file_list[i] == filename) return;


	file_list.push(filename);
	++n_file;

	content.split('\n').map(function(line){
		var c = line.split('\t');
		if (chrs[c[0]]) {
			if (!expData[c[0]]){
				expData[c[0]] = {};
				density_map[c[0]] = {};
			}

			if (!expData[c[0]][filename]){
				expData[c[0]][filename] = [];
				density_map[c[0]][filename] = [];
				for (var i = 0; i < density_len[c[0]]; i++)
					density_map[c[0]][filename].push([0,0,0,0,0,0]);
			}

			c[1] = parseInt(c[1]);
			c[2] = parseInt(c[2]);
			c[3] = parseInt(c[3]);
			var id = c[0] + '-' + filename + '-' + c[1] + '-' + c[2];
			if (c[7] == '')
				c[7] = "Unknown";

			c.push(id);
			expData[c[0]][filename].push(c.slice(1));

			// Use to draw density map
			var cell = Math.ceil(c[1]/2000000)-1;
			if (cell >= density_len[c[0]]) cell = density_len[c[0]]-1;

			++density_map[c[0]][filename][cell][c[3]-1];

			// Use to trace for turn on/off element and show inf when needed
			id_list[id] = 0;
		}
	});

	for (var chr in expData)
  			expData[chr][filename] = expData[chr][filename].sort(function(a,b){
				if (a[0] > b[0]) return  1;
				if (a[0] < b[0]) return -1;
				return 0;
			});

}

// Get experiment data by ID
function Download(id){
	if (id == expID) return;
	// Demo samples:
	if (id == 'demo') {
		var demo = ['demo1.csv','demo2.csv','demo3.csv'];
		var loaded = 0;
		demo.map(function(name){
			$.get('/samples/' + name, function(content){
				Parse(content, name);
				loaded++;
				if (loaded == demo.length){
					get_max();
					get_common();
					contruct_tree();
					SamplesLoaded();
				}
			});
		});
	}
	expID = id;
}

// 
function Modal(data){
	$('#modal').html(Template('modal', data)).modal();
}

/* -------------------------------------------- */
// Mouse actions: select a chromosome
function _ShowHelper(){
	var offset = 5000000;
	$('.chr-box').each(function(){
		var e = $(this)[0], name = $(this).data('name');
		var K = chrs[name]/$(this).width();
		$(this).mousemove(function(h){
			e.children[0].style.left = h.offsetX + 'px';
			e.children[0].style.visibility = 'visible';
			var pt = parseInt(h.offsetX * K);
			var start = pt - offset < 0 ? 0 : pt - offset;
			e.children[0].innerHTML = start;
			$("#ruler_line").css({"left": event.pageX+ "px", "visibility": "visible" });
		}).click(function(){
			var start = parseInt($(this).children('.helper').html());
			Route("#"+name+":"+start+"-"+(start+5000000));
		}).mouseout(function(){
			$("#ruler_line").css({"visibility": "hidden"});
			e.children[0].style.visibility = 'hidden';
		});
	});
}

function _ShowHelper2(){
	$('.chr-box').each(function(){
		var e = $(this)[0], name = $(this).data('name');
		var K = chrs[name]/$(this).width();
		$(this).mousemove(function(h){
			e.children[0].style.left = h.offsetX + 'px';
			e.children[0].style.visibility = 'visible';
			var pt = parseInt(h.offsetX * K);
			var start = pt< 0 ? 0 : pt;
			e.children[0].innerHTML = start;
		}).mouseout(function(){
			e.children[0].style.visibility = 'hidden';
		});
	});
}

// Showing chromosomes as one line [Thao]
function ShowAsLine(){
	$('.chr-line').html('');
	$(".gene_wrap").css({"visibility": "hidden", "height": "0"});
	doc.style.marginTop =  $('.fixed-nav')[0].offsetHeight + 'px';

	Object.keys(chrs).map(function(name, i){
		var style = 'width:' + (density_len[name] * 100 /1558) + '%';
		var title = name.substr(3);
		var chr = { title: title, name: name, style : style, width: 100, i: i };
		$('.chr-line').append(Template('chr', chr))
	});
	_ShowHelper();

	// This requires optimization =]
	$("#content").html('');
	if (n_file > 0)
		general_map();
}

function load_detail_content(name, start, end){
	$(".detail_content").css("margin-left", "-1100px");

	var screen = end-start;
	start -= screen;
	end += screen;
	var sample = d3.select(".samples")
	sample.html('').attr("height", n_file*50);

	var extra = 0;
	for (var i = 0; i < n_file; i++){
		var f = file_list[i];
		var y = i*50 + 15 + extra;
		var last_x = 0;
		sample.append("text")
			.attr("x", 1105)
			.attr("y", y)
			.attr("class", "map_name")
			.attr("id", f)
			.on("click", function(){
				remove_file(this.id);
				$(".pop_up").remove();
			})
			.on("mouseover", function(){
				$("body").append(function(){
					return $("<div/>")
						.attr("class", "pop_up")
						.attr("style", "height: 25px; font-size: 15px; font-weight: bold; text-align: center;padding: 5px; border-radius: 3px;")
						.css("left", event.pageX + 10)
						.css("top", event.pageY + 10)
						.append(function(){
							return $("<span/>").attr("class", "glyphicon glyphicon-trash");
						});
					});
			})
			.on("mouseout", function(){
				$(".pop_up").remove();
			})
			.text(f);
		y += 30 + extra;
		var add = 0;
		for (var s in expData[name][f]){
			var content = expData[name][f][s];
			if (content[0] < start) continue;
			if (content[0] > end) break;
			if ((visibleType != 0 && visibleType != content[2]) ||
				(visibleMode == 1 && id_list[content[7]] == 1) ||
				(visibleMode == 2 && id_list[content[7]] == 0)) continue;
			var x = (content[0]-start)*3300/(end-start);
			if (x < last_x + 120){
					y += 15
					if (y >= i*50 + extra + add){
							add += 15;
							sample.attr("height", n_file*50 + extra + add);
					}
			} else {
				last_x = x;	
				y = i*50 + extra + 30;
			}
			sample.append("rect")
				.attr("fill", color[content[2]])
				.attr("width", "4")
				.attr("height", "10")
				.attr("opacity", "0.8")
				.attr("x", x)
				.attr("y", y);
			sample.append("text")
				.attr("id", name + '-' + f + '-' + s)
				.attr("x", x + 8)
				.attr("y", y + 8)
				.attr("class", "content_name")
				.attr("style", "font-size: 10px")
				.text(content[5])
				.on("click", function(){
					align_contig(this.id);
				});			
		}
		extra += add;
	}
}

// Selected region on chromosome
function ShowChromosome(name, start, end){
	$(".list_name").html(name.charAt(0).toUpperCase() + name.substr(1) + '<span class="caret"></span>');
	$(".gene_wrap").css({"visibility": "visible", "height": "80px"});
	doc.style.marginTop = $('.fixed-nav')[0].offsetHeight + 'px';

	// Impossible states:
	if (!chrs[name])
		name = 'chr1';
	if (end < start + 50){
		end = start + 50;
	}

	// chromosome bar:
	$('.chr-line').html(Template('chromosome', { name: name}));
	_ShowHelper2();

	// Content
	$("#content").html('').append(Template('detail_table', {}));

	var size = chrs[name];
	var sl = $('#range')[0], 
	    place = $('#chr-one')[0],
	    box = $('#sel-box')[0];
	var ww = 3300;
	var current = [0,1], detail = 0;
	ora = [0,1];	

	// Resize
	var RangeParse = function(start, end){
		// to pixels
		var x1 = ww * start / size; 
		var x2 = ww * end / size;
		ora = start < end ? [start, end] : [end, start];
		var e = x2 > x1 ? [x1, x2] : [x2, x1];
		current = [e[0] < 0 ? 0 : e[0], e[1] > ww ? ww : e[1]];
		current.push(start > end ? end : start)
		current.push(start > end ? start : end)
		return current;
	}

	var ResizePre = function(xx){
		var e = RangeParse(xx[0], xx[1]);
		// Select-range-box
		box.style.left = e[0]/3 + 'px';
		box.style.width = e[1]/3 - e[0]/3 + 'px';
	};

	var Resized = function(xx){
		if (xx[0] > xx[1]) xx = [xx[1], xx[0]];
		var e = RangeParse(xx[0], xx[1]);
		ResizePre(xx);
		// black blur "blinds"
		$('#cs-lh-F')[0].style.width = (e[0] * 100 / ww) + '%';
		$('#cs-rh-F')[0].style.left  = (e[1] * 100 / ww) + '%';
		// Hash
		var bp1 = parseInt(e[2]);
		var bp2 = parseInt(e[3]);
		location.hash = '#' + name + ':' + bp1 + '-' + bp2;
		load_detail_content(name, bp1, bp2);
	};

	var px,ox,dx, tx,vx,ix;
	// Select range (chromosome)
	$("#range")[0].onmousedown = function(e){
		ox = e.offsetX;
		px = e.pageX;
	};
	$(".detail_content")[0].onmousedown = function(e){
		tx = e.pageX;
		ix = current;
	};

	document.onmousemove = function(e){
		// Select range ?
		if (!isNaN(ox)) {
			if (isNaN(dx)) box.style.display = 'block';
			dx = e.pageX - px;
			ResizePre([(ox)*size/1100, (ox + dx)*size/1100]);
		}
		// Move range ?
		if (!isNaN(tx)) {
			if (isNaN(vx)) box.style.display = 'block';
			vx = -(e.pageX - tx) * (ix[1] - ix[0]) / ww;
			$(".detail_content").css("margin-left", (e.pageX - tx - 1100) + "px");
			ResizePre([(ix[0] + vx) * size / ww, (ix[1] + vx) * size / ww]);
		}
	};

	document.onmouseup = function(e){
		if (!isNaN(dx)) {
			Resized([(ox)*size/1100, (ox + dx)*size/1100]);
			var obj = getBwtWeb('svgHolderT0');
 			obj.search(name.substr(3)+ ":" + (ox)*size/1100 + ".." + (ox + dx)*size/1100, function(err) {});
			}
		if (!isNaN(vx)) {
			Resized([(ix[0] + vx*3)*size/ww, (ix[1] + vx*3)*size/ww]);
			var obj = getBwtWeb('svgHolderT0');
 			obj.search(name.substr(3)+ ":" + (ix[0] + vx*3)*size/ww + ".." + (ix[1] + vx*3)*size/ww, function(err) {});

			}
		box.style.display = 'none';
		ox = NaN, px = NaN, dx = NaN, tx = NaN, vx = NaN;
	};
	Resized([start, end]);
	$(".status").css("visibility", "hidden");
}

function get_server_file(id){
	$.ajax({
		method: "get",
		dataType: "jsonp",
		url: " http://bioalgorithm.xyz/teatlas_ajax",
		data: {"id": id},
		success: function(file) {
			for (var i = 0; i < file.content.length; i++)
				Parse(file.content[i], id[i]);
			get_max();
			get_common();
			contruct_tree();
			visibleType = visibleMode = 0;
			Route();
		}
	})
}

function run_demo(){
	
}

$(document).ready(function() {
    SamplesLoaded();

	$(".status").css("visibility", "visible").html("Initialize...");
	var loc = location.hash;
	createSmallBwtWebByAl('svgHolderT0', 'sml0', '1', 5000000, 10000000, function() {
		Route(loc);
	}, function(newChr, newStart, newEnd) {
		ShowChromosome('chr' + newChr, newStart, newEnd);
	});	
});
