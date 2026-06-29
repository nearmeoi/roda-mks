import re
import json

def extract_colors():
    with open('test.html', 'r', encoding='utf-8') as f:
        html = f.read()
    
    # Try to extract the full JSON object for spConfig or jsonConfig
    for key in ['"spConfig":', '"jsonConfig":']:
        start_idx = html.find(key)
        if start_idx != -1:
            start_idx += len(key)
            # Find the starting brace
            brace_idx = html.find('{', start_idx)
            if brace_idx != -1:
                brace_count = 0
                end_idx = -1
                for i in range(brace_idx, len(html)):
                    if html[i] == '{':
                        brace_count += 1
                    elif html[i] == '}':
                        brace_count -= 1
                        if brace_count == 0:
                            end_idx = i
                            break
                if end_idx != -1:
                    json_str = html[brace_idx:end_idx+1]
                    try:
                        config = json.loads(json_str)
                        attributes = config.get('attributes', {})
                        for attr_id, attr_data in attributes.items():
                            label = attr_data.get('code', '').lower()
                            if label in ['color', 'warna', 'warna_sepeda']:
                                options = attr_data.get('options', [])
                                colors = [opt.get('label') for opt in options]
                                print("Found colors:", colors)
                                return colors
                    except Exception as e:
                        pass
    print("No colors found")
    return []

if __name__ == "__main__":
    colors = extract_colors()
