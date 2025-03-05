document.getElementById('fetchAnswers').addEventListener('click', function() {
  const button = document.getElementById('fetchAnswers');

  const enviroment = "prod"; // prod or dev 
  const apiEndpoint = enviroment === "prod" ? "https://www.extension-randomize.me/answer" : "http://localhost:5000/answer";
  
  button.disabled = true;
  button.classList.add('loading');
  
  chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
    if (tabs[0]) {
      fetch(apiEndpoint, { method: 'HEAD', mode: 'no-cors' })
        .then(() => {
          chrome.scripting.executeScript({
            target: { tabId: tabs[0].id },
            function: function() {
              function parseMathMLtoText(node) {
                if (!node) return '';
              
                if (node.nodeType === Node.TEXT_NODE) {
                  return node.textContent;
                }
              
                const tag = node.nodeName.toLowerCase();
              
                switch (tag) {
                  case 'math':
                  case 'mstyle':
                  case 'mrow':
                  case 'mphantom':
                  case 'semantics':
                  case 'annotation-xml':
                    return Array.from(node.childNodes).map(parseMathMLtoText).join('');
                  case 'mn':
                  case 'mi':
                  case 'mo':
                    return node.textContent;
                  case 'msup': {
                    const base = parseMathMLtoText(node.childNodes[0]);
                    const sup = parseMathMLtoText(node.childNodes[1]);
                    return `(${base})^(${sup})`;
                  }
                  case 'msub': {
                    const base = parseMathMLtoText(node.childNodes[0]);
                    const sub = parseMathMLtoText(node.childNodes[1]);
                    return `(${base})_(${sub})`;
                  }
                  case 'mfrac': {
                    const num = parseMathMLtoText(node.childNodes[0]);
                    const den = parseMathMLtoText(node.childNodes[1]);
                    return `(${num})/(${den})`;
                  }
                  case 'msqrt': {
                    const inside = parseMathMLtoText(node.childNodes[0]);
                    return `sqrt(${inside})`;
                  }
                  case 'mroot': {
                    const inside = parseMathMLtoText(node.childNodes[0]);
                    const index = parseMathMLtoText(node.childNodes[1]);
                    return `root(${inside}, ${index})`;
                  }
                  case 'mtable':
                  case 'mtr':
                  case 'mtd':
                    return Array.from(node.childNodes).map(parseMathMLtoText).join(' ');
                  case 'mspace':
                    return ' ';
                  
                  default:
                    return Array.from(node.childNodes).map(parseMathMLtoText).join('');
                }
              }
              
              function cleanQuestion(questionElem) {
                const clone = questionElem.cloneNode(true);
              
                const mjxContainers = clone.querySelectorAll('mjx-container');
                mjxContainers.forEach(mjx => {
                  const assistiveMath = mjx.querySelector('mjx-assistive-mml > math');
                  let mathText = '';
                  if (assistiveMath) {
                    mathText = parseMathMLtoText(assistiveMath);
                  }
                  const textNode = document.createTextNode(mathText);
                  mjx.parentNode.replaceChild(textNode, mjx);
                });
              
                const questionText = clone.textContent.trim();
                
                let choicesText = "";
                
                const form = questionElem.closest('.core')?.querySelector('.exercise_form');
                if (form) {
                  const radioOptions = form.querySelectorAll('input[type="radio"], input[type="checkbox"]');
                  if (radioOptions.length > 0) {
                    choicesText = "\n\nOptions:";
                    radioOptions.forEach(option => {
                      const label = option.closest('label') || form.querySelector(`label[for="${option.id}"]`);
                      if (label) {
                        const labelText = label.textContent.trim();
                        choicesText += `\n- ${labelText}`;
                      }
                    });
                  }
                }
                
                return questionText + choicesText;
              }
              
              function extractAllQuestions() {
                const questions = document.querySelectorAll('.exercise_question');
                const results = [];
                questions.forEach(q => {
                  const cleanedText = cleanQuestion(q);
                  results.push(cleanedText);
                });
                return results;
              }              
              
              return extractAllQuestions();
            }
          }, (results) => {
            if (results && results[0]?.result) {
              const questions = results[0].result;
              
              if (questions.length === 0) {
                alert("Aucune question trouvée sur cette page.");
                button.disabled = false;
                button.classList.remove('loading');
                return;
              }
              
              fetch(apiEndpoint, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json'
                },
                body: JSON.stringify({ questions: questions })
              })
              .then(response => {
                if (!response.ok) {
                  throw new Error(`Erreur HTTP: ${response.status}`);
                }
                return response.json();
              })
              .then(data => {
                button.disabled = false;
                button.classList.remove('loading');
                
                const answersWindow = window.open('', 'KwykSolverAnswers', 'width=600,height=600');
              
                function escapeHtml(text) {
                  return text
                    .replace(/&/g, "&amp;")
                    .replace(/</g, "&lt;")
                    .replace(/>/g, "&gt;")
                    .replace(/"/g, "&quot;")
                    .replace(/'/g, "&#039;")
                    .replace(/-/g, "&#8722;"); 
                }
                
                answersWindow.document.write(`
                  <!DOCTYPE html>
                  <html>
                    <head>
                      <title>Kwyk Solver - Réponses</title>
                      <style>
                        body {
                          font-family: Arial, sans-serif;
                          padding: 20px;
                          line-height: 1.6;
                          color: #333;
                        }
                        h1 {
                          color: #4080ff;
                          margin-bottom: 20px;
                        }
                        .answer {
                          background-color: #f5f5f5;
                          padding: 15px;
                          margin-bottom: 15px;
                          border-left: 4px solid #4080ff;
                          border-radius: 4px;
                          font-weight: normal; /* Prevent bold formatting */
                        }
                        /* Ensure consistent rendering of mathematical symbols */
                        .answer p {
                          font-family: 'Arial', sans-serif;
                          font-weight: normal;
                        }
                      </style>
                      <script src="https://polyfill.io/v3/polyfill.min.js?features=es6"></script>
                      <script id="MathJax-script" async src="https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-mml-chtml.js"></script>
                    </head>
                    <body>
                      <h1>Kwyk Solver - Réponses</h1>
                      ${data.answers.map((answer, index) => `
                        <div class="answer">
                          <strong>Question ${index + 1}:</strong>
                          <p>\\(${escapeHtml(answer).replace(/\n/g, '<br>')}\\)</p>
                        </div>
                      `).join('')}
                      <script>
                        MathJax.typeset();
                      </script>
                    </body>
                  </html>
                `);
                
                answersWindow.document.close();
              })
              .catch(error => {
                console.error('Erreur:', error);
                button.disabled = false;
                button.classList.remove('loading');
                alert(`Erreur lors de la récupération des réponses: ${error.message}`);
              });
            } else {
              button.disabled = false;
              button.classList.remove('loading');
            }
          });
        })
        .catch(() => {
          button.disabled = false;
          button.classList.remove('loading');
          alert("L'API Kwyk Solver n'est pas accessible.");
        });
    } else {
      button.disabled = false;
      button.classList.remove('loading');
      alert('Aucun onglet actif trouvé.');
    }
  });
});

document.addEventListener('DOMContentLoaded', function() {
  const disclaimerAccepted = localStorage.getItem('disclaimerAccepted');
  const disclaimerDialog = document.getElementById('disclaimerDialog');
  const fetchAnswersButton = document.getElementById('fetchAnswers');

  if (!disclaimerAccepted) {
    disclaimerDialog.style.display = 'block';
  } else {
    fetchAnswersButton.disabled = false;
  }

  document.getElementById('acceptDisclaimer').addEventListener('click', function() {
    localStorage.setItem('disclaimerAccepted', 'true');
    disclaimerDialog.style.display = 'none';
    fetchAnswersButton.disabled = false;
  });
});