import tornado.ioloop
import tornado.web
import tornado.escape
import struct
import os

chr_len = [0, 248956422, 491149951, 689445510, 879660065, 1061198324,
			1232004303, 1391350276, 1536488912, 1674883629, 1808681051,
			1943767673, 2077042982, 2191407310, 2298451028, 2400442217, 
			2490780562, 2574038003, 2654411288, 2713028904, 2777473071,
			2824183054, 2875001522, 3031042417, 3088269832 ]
}

def get_chip_seq(start, end, name):
	chip_seq = [];
	dis = int(end) - int(start)
	f = "../data/Bind"
	step = 0

	if (dis < 41250):
		f += "25."
		step = 25
	elif (dis < 165000):
		f += "100."
		step = 100
	elif (dis < 1650000):
		f += "1000."
		step = 1000
	elif (dis < 16500000):
		f += "10000."
		step = 10000
	else:
		f += "100000."
		step = 100000

	for i in range(0, 6):
		file_path = f + str(i) + ".bin"
		chip_seq.append([])
		inp = open(file_path, "r")
		prev = int(chr_len[int(name)-1]/step)
		prev *= 12
		while struct.unpack("H", inp.read(2)) < int(name):
			prev += 12
			inp.seek(prev)
		inp.seek(prev + 4)
		while struct.unpack("I", inp.read(4)) > 0:
			prev -= 12
			inp.seek(prev + 4) 

		max_size = os.path.getsize(file_path)
		for k in range(int(start), int(end), step):
			line = int(k/step)
			if (prev + line) >= 0 & line*12 <= max_size -12:
				inp.seek(prev + line*12 + 8)
				score = struct.unpack("f", inp.read(4))
				chip_seq[i].append(score[0])
			else:			
				chip_seq[i].append(0)
		inp.close()

	return chip_seq	

class MainHandler(tornado.web.RequestHandler):
    def get(self):    	
    	callbackFunc = ""
        if("callback" in self.request.arguments):
            callbackFunc = self.request.arguments["callback"][0]
            callbackFunc = str(callbackFunc)

        self.set_header('Content-Type', 'application/javascript')
	ret = []

	if self.request.arguments["inf"][0] == "file":
		print self.request.arguments["inf"]
		for name in self.request.arguments["id[]"]:
			path = '../samples/' + name
			content = open(path, "r")
			ret.append(content.read())
	elif self.request.arguments["inf"][0] == "H3K27Ac":
		ret = get_chip_seq(self.request.arguments["start"][0], self.request.arguments["end"][0], self.request.arguments["chr"][0])
        self.write("{jsfunc}({json});".format(jsfunc=callbackFunc, json=tornado.escape.json_encode({"content": ret})))
        self.finish()

def make_app():
    return tornado.web.Application([
        (r"/teatlas_ajax", MainHandler),
    ])

if __name__ == "__main__":
    app = make_app()
    app.listen(8888)
    tornado.ioloop.IOLoop.current().start()
