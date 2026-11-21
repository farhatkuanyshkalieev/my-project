"""Assemble vo.mp3 from the first take (vo_v1.mp3) and the re-recorded line (vo_new.mp3).
(source, start, end, place_at) in seconds."""
import subprocess, numpy as np
SR = 44100
def load(f): return np.frombuffer(subprocess.check_output(['ffmpeg','-v','error','-i',f,'-ac','1','-ar',str(SR),'-f','f32le','-']), np.float32)
v1, nw = load('vo_v1.mp3'), load('vo_new.mp3')
PIECES = [(v1, 0.0, 7.30, 0.0),     # Как я худела раньше … итог — минус ноль
          (v1, 8.95, 10.45, 8.2),   # Как худеют у нас
          (nw, 0.0, 1.10, 10.3),    # Диагностика
          (nw, 1.12, 2.06, 12.0),   # аппараты
          (nw, 2.10, 3.36, 13.7),   # еда без голода
          (nw, 3.45, 5.95, 16.3),   # Вес уходит — и не возвращается
          (v1, 22.50, 25.45, 19.6)] # Начните с диагностики — номер на экране
out = np.zeros(int(23.0 * SR), np.float32)
for src, a, b, at in PIECES:
    seg = src[int(a*SR):int(b*SR)].copy(); f = int(.02*SR)
    seg[:f] *= np.linspace(0,1,f); seg[-f:] *= np.linspace(1,0,f)
    s = int(at*SR); out[s:s+len(seg)] += seg
p = subprocess.Popen(['ffmpeg','-v','error','-y','-f','f32le','-ar',str(SR),'-ac','1','-i','-','-b:a','192k','vo.mp3'], stdin=subprocess.PIPE)
p.communicate(out.tobytes()); print('vo.mp3 ok')
