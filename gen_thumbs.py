"""
Generate thumbnails for all catalog items via NanoBanana (kie.ai) API.
Downloads PNG, converts to optimized JPEG (~15-30 KB) in img/thumbs/
"""
import json, time, os, requests
from PIL import Image

API_KEY = '334e5e706a5b086033d71cd38390b49c'
BASE = 'https://api.kie.ai/api/v1/jobs'
THUMBS_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'img', 'thumbs')
os.makedirs(THUMBS_DIR, exist_ok=True)

HEADERS = {'Authorization': f'Bearer {API_KEY}', 'Content-Type': 'application/json'}

# Catalog items: (item_id, option_index, prompt_description)
ITEMS = [
    # RACKET
    ('padel_std', 0, 'Padel Standard Classic court 10x20m, galvanized steel frame, tempered 10mm glass walls, 12mm artificial grass, net and posts'),
    ('padel_std', 1, 'Padel Standard Pro court 10x20m, stainless steel frame, 12mm tempered glass, 15mm grass, ITF posts, wind protection'),
    ('padel_pano', 0, 'Padel Panoramic court 10x20m, full glass enclosure 12mm, panoramic rear walls, stainless steel'),
    ('padel_pano', 1, 'Padel Super Panoramic court 10x20m, anti-glare 12mm glass, 360 degree panoramic view, 20mm grass'),
    ('padel_single', 0, 'Single padel court 20x6m, galvanized steel frame, 10mm glass walls, 12mm grass'),
    ('tennis_hard', 0, 'Tennis hard court 36x18m, 3-layer acrylic surface on concrete, ITF markings, net and posts'),
    ('tennis_hard', 1, 'Tennis hard court Premium 36x18m, 5-layer acrylic, cushioned underlayer, LED lighting, 3m fence'),
    ('tennis_hard', 2, 'Tennis hard court Pro 36x18m, 7-layer US Open type surface, double cushion, umpire chair'),
    ('tennis_grass', 0, 'Tennis artificial grass court 36x18m, 20mm grass, quartz sand infill'),
    ('tennis_grass', 1, 'Tennis fibrillated grass court 36x18m, 15mm grass, sand and rubber infill'),
    ('tennis_clay', 0, 'Tennis natural clay court 36x18m, 5-layer clay surface, drainage, irrigation system'),
    ('tennis_clay', 1, 'Tennis artificial clay court 36x18m, carpet surface, clay/sand infill, LED lighting'),
    # TEAM
    ('ice', 0, 'Olympic ice rink 60x30m, refrigeration system, hockey boards, Zamboni machine, LED lighting'),
    ('ice', 1, 'Canadian size ice rink 56x26m, NHL hockey boards, refrigeration system'),
    ('ice', 2, 'Training ice rink 40x20m, glycol cooling system, lightweight boards'),
    ('football_5', 0, 'Mini football 5v5 pitch 42x22m, 40mm artificial grass, 3x2m goals, 4m fence'),
    ('football_5', 1, 'Mini football 5v5 pitch 42x22m, 60mm FIFA Quality grass, 5m fence, LED'),
    ('football_7', 0, 'Football 7v7 pitch 62x42m, 40mm artificial grass, 5x2m goals, 5m fence'),
    ('football_7', 1, 'Football 7v7 pitch 62x42m, 60mm FIFA Quality grass, undersoil heating, LED'),
    ('football_11', 0, 'Football 11v11 full size pitch 110x70m, 40mm artificial grass, standard goals, 6m fence'),
    ('football_11', 1, 'Football 11v11 FIFA pitch 110x70m, 60mm FIFA Quality Pro grass, undersoil heating'),
    ('football_indoor', 0, 'Indoor futsal court 42x22m, maple hardwood floor, shock absorption'),
    ('football_indoor', 1, 'Indoor futsal court 42x22m, Taraflex PVC flooring'),
    ('basketball', 0, 'Outdoor basketball court 32x19m, EPDM rubber surface, FIBA markings, hoops and backboards'),
    ('basketball', 1, 'Indoor basketball court, maple hardwood floor, mobile hoops, electronic scoreboard'),
    ('basketball', 2, 'Basketball court 32x19m, 3-layer acrylic surface, hoops and backboards'),
    ('volleyball', 0, 'Indoor volleyball court 24x15m, hardwood floor, FIVB markings, net and posts'),
    ('volleyball', 1, 'Outdoor volleyball court 24x15m, EPDM rubber surface, net and posts, 3m fence'),
    ('volleyball', 2, 'Beach volleyball court, quartz sand 400mm deep, net and posts'),
    ('universal', 0, 'Multi-sport outdoor court 40x20m, EPDM rubber, markings for 3 sports, goals hoops and net'),
    ('universal', 1, 'Multi-sport indoor court, hardwood floor, markings for 3 sports, electronic scoreboard'),
    ('universal', 2, 'Compact multi-sport court 28x15m, EPDM rubber, basketball and volleyball equipment'),
    # ATHLETICS
    ('workout_s', 0, 'Small outdoor workout station 8x6m, pull-up bars, parallel bars, swedish wall, rubber surface'),
    ('workout_m', 0, 'Medium outdoor workout station 12x8m, 5 pull-up bars, parallel bars, monkey bars, abs bench'),
    ('workout_l', 0, 'Large outdoor GTO workout complex 18x10m, full calisthenics equipment, EPDM surface'),
    ('run_400', 0, 'Athletic running track 400m oval, 8 lanes, spray coat surface 13mm, IAAF markings'),
    ('run_200', 0, 'Training running track 200m oval, 4 lanes, spray coat surface'),
    ('run_100', 0, 'Sprint straight track 100m, 4 lanes, spray coat surface, starting blocks'),
    ('ocr_s', 0, 'Small obstacle course 20x6m, 8 obstacles, walls ropes monkey bars, rubber surface'),
    ('ocr_l', 0, 'Professional OCR obstacle course 100x6m, 20+ obstacles, water hazards, timing system'),
    # FUN
    ('tribune', 0, 'Mobile bleachers 50 seats, aluminum frame, plastic seats, collapsible'),
    ('tribune', 1, 'Mobile bleachers 150 seats, 3 rows, aluminum frame, handrails'),
    ('tribune', 2, 'Telescopic retractable bleachers 200 seats, padded seats, electric drive'),
    ('climb', 0, 'Children climbing wall 30sqm, h=4m, plywood panels, 200 colorful holds, safety mats'),
    ('climb', 1, 'Bouldering wall 150sqm, h=4.5m, textured plywood panels, 600 holds, crash pads'),
    ('climb', 2, 'Tall climbing wall h=15m, plywood panels, 1000+ holds, auto-belay devices'),
    ('trampoline', 0, 'Small trampoline arena 80sqm, 6 built-in trampolines, foam pit, safety padding'),
    ('trampoline', 1, 'Medium trampoline arena 150sqm, 12 trampolines, dodgeball zone, slam dunk'),
    ('trampoline', 2, 'Large trampoline park 300sqm, 20+ trampolines, acrobatic lane, ninja course'),
    # GLAMPING
    ('glamp_dome_s', 0, 'Small geodesic dome tent d=5m, steel frame, transparent PVC cover, wooden deck, summer'),
    ('glamp_dome_s', 1, 'Small geodesic dome d=5m, insulated, double glazing, heated, all-season'),
    ('glamp_dome_m', 0, 'Medium geodesic dome d=7m, steel frame, PVC cover, 2 zones, terrace, summer'),
    ('glamp_dome_m', 1, 'Medium geodesic dome d=7m, insulated, panoramic glazing, bathroom, all-season luxury'),
    ('glamp_aframe', 0, 'A-frame cabin economy, wooden frame, metal roof, 150mm insulation, panoramic window'),
    ('glamp_aframe', 1, 'A-frame cabin comfort 4 person, 200mm insulation, 2 bedrooms, bathroom, kitchenette, terrace'),
    ('glamp_aframe', 2, 'A-frame cabin premium, 250mm insulation, bathroom with sauna, underfloor heating, terrace'),
    ('glamp_modular', 0, 'Small modular cabin 6x3m, LSTK frame, 100mm sandwich panels, turnkey'),
    ('glamp_modular', 1, 'Medium modular cabin 8x3.5m, 150mm sandwich panels, 2 bedrooms, terrace'),
    ('glamp_modular', 2, 'Luxury modular cabin 8x4m, 200mm sandwich panels, panoramic windows, underfloor heating'),
    ('glamp_safari', 0, 'Safari tent classic 6x5m, waterproof canvas, wooden platform, basic furniture'),
    ('glamp_safari', 1, 'Safari tent luxury 8x6m, premium canvas, wooden deck with terrace, 2 sleeping zones'),
    # WELLNESS
    ('pool_indoor', 0, 'Indoor swimming pool 25m, stainless steel basin, 4 lanes, filtration, heating'),
    ('pool_indoor', 1, 'Indoor recreational pool 15m, counter-current, hydromassage jets, kids zone'),
    ('pool_indoor', 2, 'Indoor children pool 10x6m, shallow depth, water slides, play fountains'),
    ('pool_outdoor', 0, 'Outdoor swimming pool 25m, concrete with mosaic tiles, 4 lanes'),
    ('pool_outdoor', 1, 'Outdoor recreational pool, freeform shape, waterfall, loungers, landscaping'),
    ('pool_outdoor', 2, 'Year-round outdoor heated pool 25m, stainless steel, 28C heating, automatic cover'),
    ('hammam', 0, 'Compact Turkish hammam 15sqm, steam generator, marble walls, heated bench'),
    ('hammam', 1, 'Standard Turkish hammam 30sqm, marble, 3 heated benches, starry sky LED ceiling'),
    ('hammam', 2, 'Premium Turkish hammam 50sqm, natural marble, waterfall feature, 5 heated benches'),
    ('sauna', 0, 'Mini Finnish sauna 8sqm, cedar or alder wood, electric heater 6kW, 2-tier benches'),
    ('sauna', 1, 'Standard Finnish sauna 15sqm, cedar, electric heater 12kW, panoramic glass wall'),
    ('sauna', 2, 'Premium Finnish sauna 25sqm, Canadian cedar, 18kW heater, panoramic glazing, aroma system'),
    ('banya', 0, 'Russian banya classic, log cabin, wood-fired stove, steam room, washing room, plunge tub'),
    ('banya', 1, 'Russian banya premium, cedar log cabin, brick stove, terrace, underfloor heating'),
    ('salt_room', 0, 'Salt room 15sqm, salt block walls, halotherapy generator, 6 loungers, LED starry sky'),
    ('salt_room', 1, 'Premium salt room 25sqm, Himalayan salt walls and floor, professional halogen generator'),
    # INFRA
    ('reception', 0, 'Sports complex reception desk area, modern design, waiting zone'),
    ('cafe', 0, 'Sports cafe and bar area, bar counter, seating, modern interior'),
    ('locker_m', 0, 'Standard sports locker room, metal lockers, bench, hooks'),
    ('locker_m', 1, 'Premium sports locker room, wooden lockers, cushioned bench, hair dryer, mirror'),
    ('locker_f', 0, 'Standard women locker room, metal lockers, bench'),
    ('locker_f', 1, 'Premium women locker room, wooden lockers, vanity table, hair dryer'),
    ('wc', 0, 'Sports facility bathroom and shower area, shower cabins, toilets, sinks, tiles'),
    ('coach_room', 0, 'Coach office room, desk, chair, monitor, air conditioner'),
    ('heating', 0, 'Gas boiler room, gas boiler, chimney, automation, piping'),
    ('heating', 1, 'Diesel boiler room, diesel boiler, fuel tank, automation'),
    ('heating', 2, 'Pellet boiler room, pellet boiler, bunker, auto-feed system'),
    ('heating', 3, 'Heat substation ITP, heat exchanger, pump group, automation'),
    ('storage', 0, 'Sports equipment storage room, metal shelving, lighting'),
    ('light', 0, 'Training field lighting, 4 masts h=8m, LED floodlights 300lux'),
    ('light', 1, 'Professional sports lighting, 6 masts h=12m, LED floodlights 750lux'),
    # PREP
    ('site_prep', 0, 'Site grading and leveling, surveying equipment, bulldozer, flat terrain'),
    ('site_prep', 1, 'Earthwork excavation, excavator removing soil, dump truck'),
    ('earthworks', 0, 'Sand foundation layer 200mm, compacted sand bed, geotextile'),
    ('earthworks', 1, 'Gravel foundation layer, crushed stone 200mm with sand 100mm, compacted'),
    ('earthworks', 2, 'Concrete foundation slab, M300 concrete 150mm, reinforcement mesh'),
    ('paving', 0, 'Asphalt paving, fine-grained asphalt 50mm on gravel base'),
    ('paving', 1, 'Interlocking pavers, vibropressed blocks 60mm, sand bed, curbs'),
    ('paving', 2, 'Concrete paving, M300 concrete 100mm, reinforcement, expansion joints'),
    ('greenery', 0, 'Seeded lawn, topsoil 150mm, sports grass seed'),
    ('greenery', 1, 'Roll-out turf lawn, sod rolls being laid on prepared soil'),
    ('drainage', 0, 'Surface drainage system, concrete channels with grates, manholes'),
    ('drainage', 1, 'Deep drainage system, perforated drain pipes, geotextile, gravel trench'),
    ('fencing', 0, '3D welded mesh fence h=2m, square posts, concrete foundation, gate'),
    ('fencing', 1, 'Metal profile sheet fence h=2m, square posts, horizontal rails, gate'),
]

STYLE = ', single isolated object, 45 degree aerial view, clean white background, no surroundings, no environment, product shot style, photorealistic 3D render, studio lighting'

session = requests.Session()
session.headers.update(HEADERS)

def create_task(prompt):
    r = session.post(f'{BASE}/createTask', json={
        'model': 'nano-banana-2',
        'input': {'prompt': prompt + STYLE, 'image_input': [], 'aspect_ratio': '4:3', 'resolution': '1K', 'output_format': 'png'}
    })
    r.raise_for_status()
    return r.json()['data']['taskId']

def poll_task(task_id, max_polls=40):
    for i in range(max_polls):
        time.sleep(4)
        r = session.get(f'{BASE}/recordInfo', params={'taskId': task_id})
        d = r.json().get('data', {})
        state = d.get('state', '')
        if state == 'success':
            rj = d.get('resultJson', '')
            if rj:
                parsed = json.loads(rj)
                return parsed.get('resultUrls', [None])[0] or parsed.get('resultImageUrl')
            return d.get('response', {}).get('resultImageUrl')
        if state in ('failed', 'error'):
            return None
    return None

def download_and_compress(url, path):
    """Download PNG, resize to 400px wide, save as JPEG ~15-30 KB"""
    r = requests.get(url)
    tmp = path + '.tmp.png'
    with open(tmp, 'wb') as f:
        f.write(r.content)
    img = Image.open(tmp).convert('RGB')
    w, h = img.size
    if w > 400:
        ratio = 400 / w
        img = img.resize((400, int(h * ratio)), Image.LANCZOS)
    jpeg_path = path.replace('.png', '.jpg')
    img.save(jpeg_path, 'JPEG', quality=82, optimize=True)
    os.remove(tmp)
    return jpeg_path

def main():
    existing = set()
    for f in os.listdir(THUMBS_DIR):
        if f.endswith(('.png', '.jpg')):
            existing.add(f.rsplit('.', 1)[0])

    total = len(ITEMS)
    done = 0
    skipped = 0
    failed = []

    for item_id, opt_idx, prompt in ITEMS:
        key = f'{item_id}_{opt_idx}'
        path = os.path.join(THUMBS_DIR, f'{key}.png')
        if key in existing:
            skipped += 1
            print(f'[SKIP] {key} already exists')
            continue

        idx = done + skipped + len(failed) + 1
        print(f'[{idx}/{total}] Generating {key}...', end=' ', flush=True)
        try:
            task_id = create_task(prompt)
            url = poll_task(task_id)
            if url:
                jpg_path = download_and_compress(url, path)
                size = os.path.getsize(jpg_path)
                print(f'OK ({size//1024} KB)')
                done += 1
            else:
                print('FAILED (no URL)')
                failed.append(key)
        except Exception as e:
            print(f'ERROR: {e}')
            failed.append(key)

        time.sleep(1)

    print(f'\n=== DONE: {done} generated, {skipped} skipped, {len(failed)} failed ===')
    if failed:
        print(f'Failed: {", ".join(failed)}')

if __name__ == '__main__':
    main()
