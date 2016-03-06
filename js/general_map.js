function show_TE(id, checked){
	if (checked)
		$("."+id).css("visibility", "visible");
	else		
		$("."+id).css("visibility", "hidden");
}

function general_map(){
	var map = d3.select("#g_map")
		.html('')
		.attr("height", file_list.length*80);

	var step = 1030*1000000/chr_total;
	for (var i = 0; i < n_file; i++){
		var name = file_list[i];
		var x = 0;
		var y = i*80 + 20;
		map.append("text")
			.attr("x", 5)
			.attr("y", y)
			.attr("class", "map_name")
			.attr("id", name)
			.on("click", function(){
				remove_file(this.id);
			})
			.text(name);
		y += 20;
		for (var k in density_map[name]){
			for (var j = 0; j < density_len[k]; j++, x += step){
				for (var t = 0; t < 3; t++){
					if (density_map[name][k][j][t] == 0) continue;
					var ratio = density_map[name][k][j][t]/d_max;
	
					map.append("line")
					 	.attr("x1", x)
						.attr("y1", y - 30*ratio)
						.attr("x2", x)
						.attr("y2", y + 30*ratio)
						.attr("class", TE_type[t])
						.attr("style", "stroke:" + color[t] +"; stroke-width:"+step+"px")
						.attr("opacity", ratio*2);
				}
			}
			x += 5;
		}

	}
}

function get_max(){
	d_max = 0;
	for (var i = 0; i < n_file; i++){
		var name = file_list[i];
		for (var k in density_map[name]){
			for (var j = 0; j < density_len[k]; j++){
				var sum = density_map[name][k][j][0] + density_map[name][k][j][1] + density_map[name][k][j][2];
				if (sum > d_max) d_max = sum;
			}
		}
	}
}

function remove_file(id){
	delete expData[id];
	delete density_map[id];
	for (var i = 0; i < n_file; i++){
		if (file_list[i].localeCompare(id) == 0){
			file_list.splice(i, 1);
			break;
		}
	}
	--n_file;
	get_max();
	general_map();
}
