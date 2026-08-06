#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
content/*.json 을 고친 뒤 이 파일을 실행하면
파일 더블클릭으로 볼 때 쓰이는 사본(assets/js/content-data.js)이 갱신됩니다.

실행법:  python3 build-data.py

※ 웹 서버(Netlify 등)에 올린 홈페이지는 JSON을 직접 읽으므로
   이 작업 없이도 수정이 바로 반영됩니다.
"""
import json, io, glob, os

data = {}
for f in sorted(glob.glob('content/*.json')):
    key = os.path.basename(f).replace('.json', '')
    try:
        data[key] = json.load(io.open(f, encoding='utf-8'))
        print(f'  읽음  {f}')
    except json.JSONDecodeError as e:
        print(f'\n[오류] {f} 의 형식이 잘못되었습니다.')
        print(f'       {e.lineno}번째 줄 근처를 확인하세요: {e.msg}')
        print('       쉼표(,)나 큰따옴표(")를 빠뜨렸는지 보세요.\n')
        raise SystemExit(1)

out = ('/* 자동 생성 파일 — 직접 고치지 마세요.\n'
       '   content/*.json 을 고친 뒤 build-data.py 를 실행하면 갱신됩니다. */\n'
       'window.NEEDLAB_DATA = ' + json.dumps(data, ensure_ascii=False, indent=1) + ';\n')
io.open('assets/js/content-data.js', 'w', encoding='utf-8').write(out)
print(f'\n완료: assets/js/content-data.js 갱신 ({len(data)}개 항목)')
