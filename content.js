console.log("WaniKani to Anki: Content script loaded");

const observer = new MutationObserver(() => {
  console.log("WaniKani to Anki: DOM modified, checking for vocab elements");

  const wordElement = document.querySelector(".page-header__icon--vocabulary");
  const readingElement = document.querySelector(".reading-with-audio__reading");
  const meaningsElements = document.querySelectorAll(".subject-section__meanings-items");

  if (wordElement && readingElement && meaningsElements.length) {
    const word = wordElement.innerText.trim();
    const reading = readingElement.innerText.trim();
    const meanings = Array.from(meaningsElements).map(el => el.innerText.trim()).join(", ");
    
    console.log("WaniKani to Anki: Extracted data", { word, reading, meanings });

    document.querySelectorAll(".example").forEach((example, index) => {
      if (!example.querySelector(".anki-button")) {
        example.dataset.exampleId = index;
        const button = document.createElement("button");
        button.innerText = "Add to Anki";
        button.className = "anki-button";
        button.style.margin = "10px";

        button.addEventListener("click", () => {
          const imageElement = example.querySelector("img");
          const spanElement = example.querySelector(".base.hide");
          const meaningElement = example.querySelector(".show-on-hover");
          const furiganaElement = example.querySelector(".furigana.show-ruby-on-hover");
          let sentence = "";
          let sentenceMeaning = "";
          let sentenceFurigana = "";

          if (spanElement) {
            sentence = spanElement.innerHTML.replace(/\s+/g, "")
              .replace(/<mark>/g, "<b>")
              .replace(/<\/mark>/g, "</b>");
          }

          if (meaningElement) {
            sentenceMeaning = meaningElement.innerText.trim();
          }

          if (furiganaElement) {
            sentenceFurigana = furiganaElement.innerHTML
              .replace(/\s+/g, "")
              .replace(/<rp>|<ruby>|<rt>/g, "")
              .replace(/<\/ruby>|<\/rt>/g, "")
              .replace(/<mark>([^<]+)<\/mark>(\[[^\]]+\])/g, "<b>$1$2</b>")
              .replace(/<mark>/g, "<b>")
              .replace(/<\/mark>/g, "</b>")
              .replace(/<b>([^<]+)<\/b>(\[[^\]]+\])/g, "<b>$1$2</b>");
          }

          if (imageElement) {
            const imageUrl = imageElement.src;
            browser.runtime.sendMessage({ action: "fetchImage", url: imageUrl })
              .then(response => {
                if (response.error) {
                  console.error("Error fetching image:", response.error);
                  addToAnki(word, reading, meanings, "", sentence, sentenceMeaning, sentenceFurigana);
                } else {
                  const picture = `${word}_${index}.png`;
                  browser.runtime.sendMessage({
                    action: "addToAnki",
                    payload: {
                      "action": "storeMediaFile",
                      "version": 6,
                      "params": {
                        "filename": picture,
                        "data": response.base64
                      }
                    }
                  }).then(() => {
                    addToAnki(word, reading, meanings, picture, sentence, sentenceMeaning, sentenceFurigana);
                  });
                }
              })
              .catch(error => {
                console.error("Fetch error:", error);
                addToAnki(word, reading, meanings, "", sentence, sentenceMeaning, sentenceFurigana);
              });
          } else {
            addToAnki(word, reading, meanings, "", sentence, sentenceMeaning, sentenceFurigana);
          }
        });

        example.appendChild(button);
      }
    });
  }
});

observer.observe(document.body, { childList: true, subtree: true });

function addToAnki(word, reading, meanings, picture, sentence, sentenceMeaning, sentenceFurigana) {
  const payload = {
    "action": "addNote",
    "version": 6,
    "params": {
      "note": {
        "deckName": "Japanese::Wanikani Vocab",
        "modelName": "Kaishi 1.5k",
        "fields": {
          "Word": word,
          "Word Reading": reading,
          "Word Meaning": meanings,
          "Word Furigana": `${word}[${reading}]`,
          "Picture": picture ? `<img src='${picture}'>` : "",
          "Sentence": sentence,
          "Sentence Meaning": sentenceMeaning,
          "Sentence Furigana": sentenceFurigana
        },
        "tags": ["wanikani"],
        "options": {
          "allowDuplicate": false
        }
      }
    }
  };

  console.log("WaniKani to Anki: Sending request to AnkiConnect via background.js", payload);

  browser.runtime.sendMessage({ action: "addToAnki", payload })
    .then(data => {
      console.log("WaniKani to Anki: Response from AnkiConnect", data);
      if (data.error) {
        alert("AnkiConnect Error: " + data.error);
      } else {
        alert("Added to Anki!");
      }
    })
    .catch(error => console.error("WaniKani to Anki: Fetch error", error));
}