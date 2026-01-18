# Silencer 🔇

Silencer je eksperimentalna Chrome ekstenzija za inteligentno blokiranje oglasa. Projekt je nastao u svrhu istraživanja i učenja o izradi web scrapera, manipulaciji DOM-om kroz ekstenzije te implementaciji ML modela u pregledniku.

## 🚀 Ključne funkcionalnosti
- **Klasifikacija zahtjeva** : Analiza HTTP prometa pomoću XGBoost logike za detekciju oglasa.

- **Korisnički Feedback Loop** : Implementirana poveznica sa Supabase bazom podataka. Korisnici mogu prijaviti greške, a ti se podaci spremaju za budući trening preciznijeg modela.

- **Ručno prikupljeni podaci**: Skup podataka za trening temelji se na pažljivo odabranim i ručno pronađenim izvorima (links), koji su zatim obrađeni prilagođenim scraperom.

## ⚠️ Trenutni izazovi i "Work in Progress"

S obzirom na to da je ovo projekt u svrhu učenja, trenutno postoje jasni tehnički izazovi na kojima se radi u novoj verziji:

- **Arhitektura modela** (JS implementacija): Trenutni model se vrti unutar ručno pisane JavaScript datoteke. Iako funkcionalan, ovaj pristup ne iskorištava puni potencijal XGBoost algoritma (poput automatskog upravljanja nedostajućim podacima/null vrijednostima), što planiram riješiti uvođenjem ONNX Runtime-a.

- **Agresivna filtracija (Over-blocking)**: Model trenutno blokira preširok spektar zahtjeva, što rezultira velikim brojem lažno pozitivnih rezultata i narušava funkcionalnost nekih stranica.

- **Optimizacija performansi**: Zbog neoptimiziranog koda klasifikatora, dolazi do zamjetnog usporavanja brzine preglednika pri učitavanju kompleksnih stranica.

## 🛠 Plan za verziju 2.0
- Prelazak na ONNX i Flask za stabilnije izvođenje modela.

- Rafiniranje baze podataka u Supabase-u radi smanjenja stope lažno pozitivnih/negativnih rezultata.

- Poboljšanje brzine klasifikacije.
