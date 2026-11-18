"""Sorteia o plano secreto de uma partida de Sombra no Guaíba: extração, janela, contatos e envelopes.

Regras (GDD §8.1 e §8.2):
  - 4 pistas ONDE: juntas eliminam os 5 pontos errados; quaisquer 3 deixam no máximo 2 candidatos;
    nenhuma sozinha elimina mais de 3; nenhuma elimina o ponto certo.
  - 2 pistas QUANDO: cada uma elimina exatamente 2 janelas erradas; juntas sobra só a certa.
  - 2 CREDENCIAIS.
  - 8 contatos sorteados entre os candidatos do mapa, em pelo menos 5 zonas diferentes.

Uso:
  python3 gerar_pistas.py            mostra uma partida de exemplo
  python3 gerar_pistas.py --testar   confere as regras em 2000 sorteios
"""
import json, os, random, sys
from itertools import combinations

HERE = os.path.dirname(os.path.abspath(__file__))
MAPA = json.load(open(os.path.join(HERE, "mapa.json")))
NOME = {n["id"]: n["curto"] for n in MAPA["locais"]}
ZONA = {n["id"]: n["zona"] for n in MAPA["locais"]}
ID = {v: k for k, v in NOME.items()}

EXTRACOES = {
    "Cais Mauá": {"meio": "agua", "regiao": "centro"},
    "Rodoviária": {"meio": "terra", "regiao": "centro"},
    "Aeroporto": {"meio": "ar", "regiao": "norte"},
    "Ponte do Guaíba": {"meio": "terra", "regiao": "norte"},
    "Ilha da Pintada": {"meio": "agua", "regiao": "ilhas"},
    "Belém Novo": {"meio": "agua", "regiao": "sul"},
}
assert {ID[k] for k in EXTRACOES} == set(MAPA["pontos_extracao"])
TODOS = set(EXTRACOES)
def onde(texto, elimina): return {"texto": texto, "elimina": sorted(elimina)}
MODELOS_ONDE = [
    onde("Esqueça a água: o Guaíba está vigiado.", {k for k, v in EXTRACOES.items() if v["meio"] == "agua"}),
    onde("Nada de estrada desta vez.", {k for k, v in EXTRACOES.items() if v["meio"] == "terra"}),
    onde("Não haverá voo.", {"Aeroporto"}),
    onde("O contato evita o Centro.", {k for k, v in EXTRACOES.items() if v["regiao"] == "centro"}),
    onde("O contato não atravessa o rio.", {"Ilha da Pintada", "Ponte do Guaíba"}),
    onde("Longe da Zona Norte.", {k for k, v in EXTRACOES.items() if v["regiao"] == "norte"}),
    onde("Nada no Extremo Sul.", {"Belém Novo"}),
    onde("Nem barco de pescador, nem ônibus de linha.", {"Ilha da Pintada", "Rodoviária"}),
    onde("Os armazéns do cais estão cheios de câmeras.", {"Cais Mauá"}),
    onde("A rodoviária tem polícia demais.", {"Rodoviária"}),
] + [onde(f"Não é {'no' if k in ('Cais Mauá', 'Aeroporto') else 'na' if k in ('Rodoviária', 'Ponte do Guaíba', 'Ilha da Pintada') else 'em'} {k}.", {k}) for k in EXTRACOES]

JANELAS = {"A": [9, 10], "B": [13, 14], "C": [17, 18], "D": [21, 22]}
MODELOS_QUANDO = [
    {"texto": "Só depois que escurecer.", "elimina": ["A", "B"]},
    {"texto": "Ainda com a luz do dia.", "elimina": ["C", "D"]},
    {"texto": "Nem à tarde, nem de madrugada.", "elimina": ["A", "D"]},
    {"texto": "Nem no rush da tarde, nem perto da meia-noite.", "elimina": ["B", "C"]},
    {"texto": "Os guardas trocam de turno às 14h e às 22h: evite esses horários.", "elimina": ["A", "C"]},
    {"texto": "No rush e na madrugada as saídas estão vigiadas.", "elimina": ["B", "D"]},
]
SENHAS = ["Chimarrão sem açúcar.", "O minuano sopra do sul.", "O sol se põe no Gasômetro.", "A ponte subiu às seis.",
          "Bah, que frio.", "Tri legal, tchê.", "O Guaíba é um lago.", "Quero-quero não dorme."]

def gerar(seed=None):
    r = random.Random(seed)
    ext = r.choice(sorted(EXTRACOES)); jan = r.choice(sorted(JANELAS))
    erradas = TODOS - {ext}
    validos = [m for m in MODELOS_ONDE if ext not in m["elimina"] and len(m["elimina"]) <= 3]
    combos = []
    for c in combinations(validos, 4):
        sets = [set(m["elimina"]) for m in c]
        if set().union(*sets) != erradas: continue
        if any(len(set().union(*t)) < 4 for t in combinations(sets, 3)): continue
        if len({m["texto"] for m in c}) < 4: continue
        combos.append(c)
    assert combos, f"sem combinação ONDE para {ext}"
    pistas_onde = list(r.choice(combos))
    qv = [m for m in MODELOS_QUANDO if jan not in m["elimina"]]
    pares = [p for p in combinations(qv, 2) if set(p[0]["elimina"]) | set(p[1]["elimina"]) == set(JANELAS) - {jan}]
    pistas_quando = list(r.choice(pares))
    senhas = r.sample(SENHAS, 2)
    envelopes = ([{"tipo": "ONDE", **p} for p in pistas_onde] + [{"tipo": "QUANDO", **p} for p in pistas_quando] +
                 [{"tipo": "CREDENCIAL", "texto": f"Senha: “{s}”", "dinheiro": 2} for s in senhas])
    cand = MAPA["contatos_candidatos"]
    while True:
        contatos = r.sample(cand, MAPA["contatos_sorteados"])
        if len({ZONA[c] for c in contatos}) >= 5: break
    r.shuffle(envelopes)
    return {
        "seed": seed, "extracao": {"id": ID[ext], "nome": ext}, "janela": {"letra": jan, "rodadas": JANELAS[jan]},
        "contatos": [{"local": c, "nome": NOME[c], "envelope": e} for c, e in zip(contatos, envelopes)],
        "candidatos_nao_sorteados": [c for c in cand if c not in contatos],
    }

def testar(n=2000):
    vistos = set()
    for s in range(n):
        p = gerar(s); ext = p["extracao"]["nome"]; jan = p["janela"]["letra"]; vistos.add((ext, jan))
        onde_ = [set(c["envelope"]["elimina"]) for c in p["contatos"] if c["envelope"]["tipo"] == "ONDE"]
        quando = [set(c["envelope"]["elimina"]) for c in p["contatos"] if c["envelope"]["tipo"] == "QUANDO"]
        creds = [c for c in p["contatos"] if c["envelope"]["tipo"] == "CREDENCIAL"]
        assert len(onde_) == 4 and len(quando) == 2 and len(creds) == 2 and len(p["contatos"]) == 8
        assert all(ext not in e for e in onde_) and set().union(*onde_) == TODOS - {ext}
        assert all(len(e) <= 3 for e in onde_)
        assert all(len(set().union(*t)) >= 4 for t in combinations(onde_, 3))
        assert all(jan not in q and len(q) == 2 for q in quando) and quando[0] | quando[1] == set(JANELAS) - {jan}
        assert len({ZONA[c["local"]] for c in p["contatos"]}) >= 5
        assert len({c["local"] for c in p["contatos"]}) == 8
    assert len(vistos) == 24, f"só {len(vistos)} das 24 combinações apareceram"
    print(f"OK: {n} sorteios, as 24 combinações de extração × janela aparecem, todas as regras conferem.")

if __name__ == "__main__":
    if "--testar" in sys.argv: testar()
    else:
        p = gerar(int(sys.argv[1]) if len(sys.argv) > 1 else 2026)
        print(f"Extração: {p['extracao']['nome']} · Janela {p['janela']['letra']} (rodadas {p['janela']['rodadas']})")
        for c in p["contatos"]: print(f"  {c['nome']:<22} {c['envelope']['tipo']:<10} {c['envelope']['texto']}")
