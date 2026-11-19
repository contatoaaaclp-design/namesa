"""Extrai somente o catálogo público dos restaurantes. Requer beautifulsoup4."""
import concurrent.futures
import gzip
import json
import re
import sys
import urllib.parse
import urllib.request
from pathlib import Path
from bs4 import BeautifulSoup

ROOT = Path(__file__).resolve().parents[1] / 'data' / 'imports'
ROOT.mkdir(parents=True, exist_ok=True)

def fetch(url, ajax=False):
    headers = {'User-Agent': 'Mozilla/5.0'}
    if ajax:
        headers['X-Requested-With'] = 'XMLHttpRequest'
    with urllib.request.urlopen(urllib.request.Request(url, headers=headers), timeout=40) as response:
        data = response.read()
    if data[:2] == b'\x1f\x8b':
        data = gzip.decompress(data)
    return data.decode('utf-8')

def cents(value):
    return round(float(value or 0) * 100)

def text(node):
    return re.sub(r'\s+', ' ', node.get_text(' ', strip=True)).strip() if node else ''

def minimum_price(base, groups):
    for group in groups:
        if group['min']:
            prices = sorted(p['price'] for p in group['options'] for _ in range(p['maxQuantity']))
            base += max(prices[:group['min']]) if group.get('pricing') == 'max' else sum(prices[:group['min']])
    return base

def saipos():
    api = 'https://delivery-api.saipos.com/v1/'
    stores = json.loads(fetch(api + 'stores?filter=' + urllib.parse.quote(json.dumps({'domain_name': 'saborecia.saipos.com', 'is_table_module': False}))))
    store = stores[0]
    params = {'saleModule': 'DELIVERY', 'idStoreSiteData': store['id_store_site_data']}
    source = json.loads(fetch(api + f"stores/{store['id_store']}/sales/view-data?data=" + urllib.parse.quote(json.dumps(params))))
    choices = {g['id_store_choice']: g for g in source['choices']}
    products = []
    for item in source['items']:
        category = item['category_item']
        if category['desc_store_category_item'].strip().lower() == 'avisos' or category.get('enabled') != 'Y':
            continue
        for variation in item['variations']:
            if variation['enabled'] != 'Y':
                continue
            groups = []
            for link in sorted(item['choices'], key=lambda g: g['order']):
                group = choices.get(link['id_store_choice'])
                if not group:
                    # O catálogo público omite grupos desativados; o frontend também os ignora.
                    continue
                name = (group['desc_store_choice_delivery'] or group['desc_store_choice']).strip()
                options = []
                size_group = name.upper() in ['TAMANHO', 'FEIJOADA', 'MEDIA']
                maximum = 1 if group['choice_type'] == 2 or size_group else min(50, group['max_choices'])
                for option in sorted(group['choice_items'], key=lambda o: o['order']):
                    if option['enabled'] != 'Y':
                        continue
                    price = next((v['aditional_price'] for v in option['variations'] if v['id_store_variation'] == variation['id_store_variation']), 0)
                    option_name = (option['desc_store_choice_item_deli'] or option['desc_store_choice_item']).strip()
                    option_name = re.sub(r'\s*\(\s*un\.?[^)]*\)', '', option_name, flags=re.I).strip()
                    options.append({'id': str(option['id_store_choice_item']), 'name': option_name, 'price': cents(price), 'maxQuantity': maximum})
                if not options:
                    if group['min_choices']:
                        raise ValueError(f'Grupo obrigatório vazio: {name}')
                    continue
                if group['calc_method'] != 1:
                    raise ValueError(f"Cálculo Saipos não suportado: {group['calc_method']}")
                groups.append({'id': str(group['id_store_choice']), 'name': name, 'min': min(group['min_choices'], maximum), 'max': maximum, 'options': options})
            base = cents(variation['price'])
            products.append({'id': f"saipos-{variation['id_store_item_variation']}", 'restaurant': 'Sabor & Cia', 'name': (item['desc_store_item_delivery'] or item['desc_store_item']).strip(), 'description': text(BeautifulSoup(item['detail'] or item['desc_store_item'], 'html.parser'))[:500], 'price': minimum_price(base, groups), 'basePrice': base, 'optionGroups': groups, 'image': 'https://static.saipos.com/' + item['img_path'] if item['img_path'] else '', 'tags': [category['desc_store_category_item'].strip()], 'sourceUrl': 'https://saborecia.saipos.com/'})
    return products

def fidfacil():
    host = 'https://ladome.fidfacil.com.br'
    home = BeautifulSoup(fetch(host), 'html.parser')
    items = {}
    for card in home.select('.item-produto-outer'):
        match = re.search(r'/produtos/visualizar/(\d+)', str(card))
        if match:
            items[match[1]] = card
    def product(entry):
        identifier, card = entry
        cached = ROOT / f'fid-{identifier}.html'
        raw = cached.read_text(encoding='utf-8') if '--cached' in sys.argv and cached.exists() else fetch(host + '/produtos/visualizar/' + identifier, True)
        (ROOT / f'fid-{identifier}.html').write_text(raw, encoding='utf-8')
        soup = BeautifulSoup(raw, 'html.parser')
        form = soup.select_one('form[action="/carrinho/adicionar"]')
        if not form:
            raise ValueError(f'Formulário ausente: {identifier}')
        groups = []
        for group in form.select('.ctn-opcoes-item'):
            inputs = group.select('input[data-price][name]')
            if not inputs:
                continue
            heading = group.find_previous_sibling('div')
            name = text(heading)
            if not name or 'options-search' in (heading.get('class', []) if heading else []):
                heading = heading.find_previous_sibling('div') if heading else None
                name = text(heading)
            name = re.sub(r'\bEtapa\s*\d+\b', '', name, flags=re.I).strip()[:100]
            minimum = int(group.get('min-quantidade', 0))
            maximum = int(group.get('max-quantidade', 0)) or 50
            maximum = min(maximum, 50)
            if 'TAMANHO' in name.upper():
                maximum = 1  # Um tamanho por marmita; quantidades ficam na sacola.
            options = []
            for inp in inputs:
                if inp.has_attr('disabled') or inp.find_parent(class_='sem-estoque'):
                    continue
                label = group.find('label', attrs={'for': inp['id']})
                if not label:
                    row = inp.find_parent(class_='form-group')
                    label = row.find('label') if row else None
                option_name = text(label).split('R$')[0].strip()
                if not option_name:
                    raise ValueError(f'Nome de opção ausente: {identifier}, {inp["id"]}')
                typ = int(inp.get('data-tipo', 0))
                if typ not in [1,7,8]:
                    raise ValueError(f'Tipo FID não suportado: {typ}')
                cap = 1 if inp.get('type') in ['radio', 'checkbox'] else int(inp.get('data-max-qtde', 0)) or maximum
                options.append({'id': inp['id'].split('-')[-1], 'name': option_name[:150], 'price': cents(inp['data-price']), 'maxQuantity': min(cap,maximum)})
            if not options:
                if minimum:
                    raise ValueError(f'Grupo obrigatório vazio: {identifier}')
                continue
            group_id = re.search(r'\[(\d+)\]', inputs[0]['name']).group(1)
            types = {int(i.get('data-tipo', 0)) for i in inputs}
            groups.append({'id': group_id, 'name': name or 'Escolhas', 'min': minimum, 'max': maximum, 'pricing': 'max' if 7 in types else 'sum', 'options': options})
        base_match = re.search(r'ProdutoValorTotal\s*\+=\s*(\d+(?:\.\d+)?)\s*;', raw)
        if not base_match:
            raise ValueError(f'Preço base ausente: {identifier}')
        base = cents(base_match.group(1))
        image = card.select_one('img[data-src]')
        name = text(card.select_one('h3'))
        return {'id': 'fid-' + identifier, 'restaurant': 'Lar dos Sabores', 'name': name, 'description': text(soup.select_one('.modal-produto-descricao'))[:500] or name, 'price': minimum_price(base,groups), 'basePrice': base, 'optionGroups': groups, 'image': image['data-src'] if image else '', 'tags': ['Vegetariano' if 'VEGETARIANA' in name.upper() else 'Cardápio'], 'sourceUrl': host + '/#produto-' + identifier}
    with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:
        return list(pool.map(product, items.items()))

if __name__ == '__main__':
    with concurrent.futures.ThreadPoolExecutor(max_workers=2) as pool:
        results = list(pool.map(lambda fn: fn(), [saipos, fidfacil]))
    products = results[0] + results[1]
    if any(product['price'] < 100 for product in products):
        raise ValueError('Produto sem preço de venda válido.')
    output = ROOT / 'external-products.json'
    output.write_text(json.dumps(products, ensure_ascii=False, indent=2), encoding='utf-8')
    print(f'{len(results[0])} produtos Sabor & Cia; {len(results[1])} produtos Lar dos Sabores. Catálogo salvo em {output}', flush=True)
