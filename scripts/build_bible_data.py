import urllib.request
import json
import sys
import re
import zhconv

def main():
    sys.stdout.reconfigure(encoding='utf-8')
    print("Downloading CUV Bible...")
    u = 'https://raw.githubusercontent.com/thiagobodruk/bible/master/json/zh_cunpss-shen.json'
    req = urllib.request.Request(u, headers={'User-Agent': 'Mozilla/5.0'})
    with urllib.request.urlopen(req) as r:
        raw_data = json.loads(r.read().decode('utf-8'))

    with open('data/books.js', 'r', encoding='utf-8') as f:
        books_js = f.read()

    book_names = re.findall(r'name:\s*["\']([^"\']+)["\']', books_js)
    print(f"Loaded {len(book_names)} book names from books.js: {book_names[:5]}")

    if len(book_names) != 66 or len(raw_data) != 66:
        print(f"Error: length mismatch! book_names={len(book_names)}, raw_data={len(raw_data)}")
        return

    cuv_dict = {}
    for idx, b_data in enumerate(raw_data):
        b_name = book_names[idx]
        cuv_dict[b_name] = {}
        for c_idx, chap in enumerate(b_data['chapters']):
            c_num = str(c_idx + 1)
            # convert each verse from simplified to traditional zh-tw/zh-hant
            cuv_dict[b_name][c_num] = [zhconv.convert(v, 'zh-hant') for v in chap]

    out_path = 'data/bible_cuv.json'
    with open(out_path, 'w', encoding='utf-8') as out_f:
        json.dump(cuv_dict, out_f, ensure_ascii=False, separators=(',', ':'))

    print(f"SUCCESS! Wrote {out_path} with all 66 books and 1189 chapters!")
    print(f"創世記 1:1 -> {cuv_dict['創世記']['1'][0]}")
    print(f"約書亞記 1:9 -> {cuv_dict['約書亞記']['1'][8]}")
    print(f"詩篇 23:1 -> {cuv_dict['詩篇']['23'][0]}")
    print(f"羅馬書 8:38 -> {cuv_dict['羅馬書']['8'][37]}")
    print(f"啟示錄 22:21 -> {cuv_dict['啟示錄']['22'][-1]}")

if __name__ == '__main__':
    main()
