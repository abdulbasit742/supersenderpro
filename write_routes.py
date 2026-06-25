import os
ROOT = r"C:/Users/absh5/supersenderpro"
def w(rel, src):
    p = os.path.join(ROOT, rel)
    os.makedirs(os.path.dirname(p), exist_ok=True)
    open(p,"w",encoding="utf-8").write(src)
    print("wrote",rel)
