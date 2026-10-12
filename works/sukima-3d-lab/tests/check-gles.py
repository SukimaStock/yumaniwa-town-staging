"""Optional Mesa/EGL pixel check. Requires libEGL + Pillow; never browser/device certification.
Usage: node tests/render-scenes.mjs | python tests/check-gles.py /tmp/touch-v02-render
"""
import ctypes as C
import json
import math
from pathlib import Path
import sys
from PIL import Image

payload = json.load(sys.stdin)
output = Path(sys.argv[1]); output.mkdir(parents=True, exist_ok=True)
E = C.CDLL('libEGL.so.1')
E.eglGetProcAddress.restype = C.c_void_p
E.eglGetProcAddress.argtypes = [C.c_char_p]
P, I, U, F = C.c_void_p, C.c_int, C.c_uint, C.c_float

def egl(name, result, args):
    fn = getattr(E, name); fn.restype = result; fn.argtypes = args
    return fn

def gl(name, result, *args):
    address = E.eglGetProcAddress(name.encode())
    if not address: raise RuntimeError('Missing GL entry point: ' + name)
    return C.CFUNCTYPE(result, *args)(address)

platform = C.CFUNCTYPE(P, U, P, C.POINTER(I))(E.eglGetProcAddress(b'eglGetPlatformDisplayEXT'))
display = platform(0x31DD, None, None)
a, b = I(), I()
assert egl('eglInitialize', U, [P, C.POINTER(I), C.POINTER(I)])(display, C.byref(a), C.byref(b))
attributes = (I*15)(0x3033,1,0x3040,0x40,0x3024,8,0x3023,8,0x3022,8,0x3025,24,0x3021,8,0x3038)
config, count = P(), I()
assert egl('eglChooseConfig',U,[P,C.POINTER(I),C.POINTER(P),I,C.POINTER(I)])(display,attributes,C.byref(config),1,C.byref(count)) and count.value
E.eglBindAPI(0x30A0)
context = egl('eglCreateContext',P,[P,P,P,C.POINTER(I)])(display,config,None,(I*3)(0x3098,3,0x3038))
make_current = egl('eglMakeCurrent',U,[P,P,P,P])
assert context and make_current(display,None,None,context)
get_string = gl('glGetString',C.c_char_p,U)
print(get_string(0x1F02).decode(), get_string(0x1F01).decode())
shaders = []
for name, kind in [('VERTEX',0x8B31),('FRAGMENT',0x8B30)]:
    shader = gl('glCreateShader',U,U)(kind)
    text = C.c_char_p(payload['shaders'][name].encode())
    gl('glShaderSource',None,U,I,C.POINTER(C.c_char_p),C.POINTER(I))(shader,1,C.byref(text),None)
    gl('glCompileShader',None,U)(shader)
    ok = I(); gl('glGetShaderiv',None,U,U,C.POINTER(I))(shader,0x8B81,C.byref(ok))
    if not ok.value:
        log = C.create_string_buffer(4096)
        gl('glGetShaderInfoLog',None,U,I,C.POINTER(I),C.c_char_p)(shader,4096,None,log)
        raise RuntimeError(log.value.decode())
    shaders.append(shader)
program = gl('glCreateProgram',U)()
for shader in shaders: gl('glAttachShader',None,U,U)(program,shader)
gl('glLinkProgram',None,U)(program)
ok = I(); gl('glGetProgramiv',None,U,U,C.POINTER(I))(program,0x8B82,C.byref(ok)); assert ok.value
vao, buffer = U(), U()
gl('glGenVertexArrays',None,I,C.POINTER(U))(1,C.byref(vao)); gl('glBindVertexArray',None,U)(vao)
gl('glGenBuffers',None,I,C.POINTER(U))(1,C.byref(buffer)); gl('glBindBuffer',None,U,U)(0x8892,buffer)
for index in range(3):
    gl('glEnableVertexAttribArray',None,U)(index)
    gl('glVertexAttribPointer',None,U,I,U,U,I,P)(index,3,0x1406,0,36,P(index*12))
uniform = gl('glGetUniformLocation',I,U,C.c_char_p)
locations = {key:uniform(program,key.encode()) for key in ['projection','model','distance','shadow']}
assert all(location>=0 for location in locations.values())
um = gl('glUniformMatrix4fv',None,I,I,U,C.POINTER(F))
uf = gl('glUniform1f',None,I,F); ui = gl('glUniform1i',None,I,I)
read_pixels = gl('glReadPixels',None,I,I,I,I,U,U,P)
images = {}
for scene in payload['scenes']:
    width, height = scene['width'], scene['height']
    surface = egl('eglCreatePbufferSurface',P,[P,P,C.POINTER(I)])(display,config,(I*5)(0x3057,width,0x3056,height,0x3038))
    assert surface and make_current(display,surface,surface,context)
    gl('glViewport',None,I,I,I,I)(0,0,width,height)
    gl('glClearColor',None,F,F,F,F)(238/255,233/255,223/255,1)
    gl('glClear',None,U)(0x4000|0x100)
    gl('glUseProgram',None,U)(program)
    um(locations['projection'],1,0,(F*16)(*scene['projection']))
    um(locations['model'],1,0,(F*16)(*scene['model']))
    uf(locations['distance'],scene['distance']); ui(locations['shadow'],0)
    gl('glEnable',None,U)(0xB71); gl('glEnable',None,U)(0xB44); gl('glCullFace',None,U)(0x405)
    array = (F*len(scene['packed']))(*scene['packed'])
    gl('glBufferData',None,U,C.c_ssize_t,P,U)(0x8892,C.sizeof(array),array,0x88E8)
    gl('glDrawArrays',None,U,I,I)(4,0,len(scene['packed'])//9)
    pixels = (C.c_ubyte*(width*height*4))()
    read_pixels(0,0,width,height,0x1908,0x1401,pixels)
    assert gl('glGetError',U)()==0
    image = Image.frombytes('RGBA',(width,height),bytes(pixels)).transpose(Image.Transpose.FLIP_TOP_BOTTOM).convert('RGB')
    body_pixels = sum(pixel != (238,233,223) for pixel in image.get_flattened_data()); assert body_pixels>5000
    key = (width,height,scene['label']); images[key] = image.tobytes()
    image.save(output/f"{width}x{height}-{scene['label']}.png")
    make_current(display,None,None,context); egl('eglDestroySurface',U,[P,P])(display,surface)
for (width,height,label), pixels in images.items():
    if label == 'rest': continue
    before = images[width,height,'rest']
    changes = sum(before[i:i+3] != pixels[i:i+3] for i in range(0,len(before),3))
    assert changes>300, (width,height,label,changes)
    print(f'{width}x{height} {label}: {changes} changed pixels, GL error 0')
print(f'PASS: exact shaders compile/link; {len(images)} specimen frames. GLES evidence only.')
