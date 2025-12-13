import requests
import json
from pathlib import Path

URL = 'http://localhost:8000/eligibility-check'
PDF_PATH = Path(__file__).parent / 'test_sample.pdf'

answers = {
    'user_id': None,
    'case_id': None,
    'answers': {
        'A1_full_name': 'Test User',
        'B3_mechanism': 'fall'
    }
}

questions = [
    {'id': 'B3_mechanism', 'text': 'Mechanism or cause of injury (fall, impact, overexertion, chemical, noise, infection, other)'},
    {'id': 'E1_affected_body_parts', 'text': 'Which body parts/organs are affected?'}
]

print(f"Posting to {URL} with file {PDF_PATH}")
with open(PDF_PATH, 'rb') as f:
    files = {'file': ('test_sample.pdf', f, 'application/pdf')}
    data = {'answers': json.dumps(answers), 'questions': json.dumps(questions)}
    try:
        r = requests.post(URL, data=data, files=files, timeout=120)
        print('Status:', r.status_code)
        try:
            print('JSON response:')
            print(json.dumps(r.json(), indent=2, ensure_ascii=False))
        except Exception:
            print('Response text:')
            print(r.text)
    except Exception as e:
        print('Request failed:', str(e))
