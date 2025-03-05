from flask import Flask, request, jsonify
from g4f.client import Client
from flask_cors import CORS  
import time
import re

app = Flask(__name__)
CORS(app) 

def extract_responses(text):
    responses = []
    level = 0
    start_idx = -1
    
    for i, char in enumerate(text):
        if (char == '{'):
            if (level == 0):
                start_idx = i + 1 
            level += 1
        elif (char == '}'):
            level -= 1
            if (level == 0 and start_idx != -1):
                responses.append(text[start_idx:i]) 
                start_idx = -1
    
    formatted_responses = []
    for i, resp in enumerate(responses):
        if (';' in resp and all(c.isdigit() or c in ';,' for c in resp.replace(' ', ''))):
            formatted_responses.append(f"Réponse {i+1}: \\{{{resp}\\}}")  # LaTeX format
        else:
            formatted_responses.append(f"Réponse {i+1}: {resp}")
    
    return formatted_responses

def ask_llm(questions, model):
    client = Client()
    response = client.chat.completions.create(
        model=model,
        messages=[
            {
                "role": "system",
                "content": (
                    "Tu es un assistant expert en mathématiques. Ta tâche est de résoudre les questions mathématiques et de fournir les réponses en format LaTeX. Ne dit rien d'autre que la réponse au format LaTeX en suivant le format {réponse1}{réponse2}..."
                )
            },
            {
                "role": "user",
                "content": (
                    "Résous les questions suivantes et donne uniquement la réponse LaTeX pour chacune.\n\n Questions :\n" + "\n".join(questions) + "\n"
                )
            }
        ],
        web_search=False
    )
    return response.choices[0].message.content

@app.route('/ok', methods=['GET', 'HEAD'])
def index():
    return "Server is running"

@app.route('/answer', methods=['POST'])
def get_answers():
    data = request.get_json()
    questions = data.get('questions', [])
    
    answers = []
    try:
        response_content = ask_llm(questions, "o3-mini")
        print("\n".join(questions))
        print("ok 1")
        print(response_content)
        responses = extract_responses(response_content)
        answers.append("\n".join(responses))
        print("ok 2")
        print("\n".join(responses))

    except Exception as e:
        print(f"Error {str(e)}")
        try:
            response_content = ask_llm(questions, "deepseek-r1")
            print("\n".join(questions))
            print("ok 1")
            print(response_content)
            responses = extract_responses(response_content)
            answers.append("\n".join(responses))
            print("ok 2")
            print("\n".join(responses))
        except Exception as e:
            answers.append(f"Erreur en obtenant la réponse : {str(e)}")
    return jsonify({'answers': answers})

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)