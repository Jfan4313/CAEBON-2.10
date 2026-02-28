import re

with open('/Users/su/Desktop/code/项目/零碳项目收益评估软件前端/components/ProjectEntry.tsx', 'r') as f:
    lines = f.readlines()

def track_imbalance(start, end):
    print(f"Tracking from {start} to {end}")
    stack = []
    for i in range(start, end + 1):
        line = lines[i]
        opens = len(re.findall(r'<div\b[^>]*>', line))
        closes = len(re.findall(r'</div\s*>', line))
        
        for _ in range(opens):
            stack.append(i)
        
        for _ in range(closes):
            if len(stack) > 0:
                stack.pop()
            else:
                print(f"EXTRA CLOSE at line {i}: {line.strip()}")
                
    if len(stack) > 0:
        print(f"UNCLOSED OPENS: {stack}")
    else:
        print("PERFECTLY BALANCED")

# Let's find exactly the three sections!
sections = []
for i, line in enumerate(lines):
    if '<section' in line:
        sections.append({'start': i})
    if '</section>' in line:
        sections[-1]['end'] = i

for idx, s in enumerate(sections):
    print(f"\n--- Section {idx+1} ---")
    track_imbalance(s['start'], s['end'])

