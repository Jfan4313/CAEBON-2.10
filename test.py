import re

with open('/Users/su/Desktop/code/项目/零碳项目收益评估软件前端/components/ProjectEntry.tsx', 'r') as f:
    text = f.read()

# Let's extract the <section> starting around line 483 and ending around line 665
lines = text.split('\n')
for i, line in enumerate(lines):
    if '<section className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm">' in line:
        start = i
    if '</section>' in line:
        end = i

print(f"Section 1 starts at {start} and ends at {end}")

for i in range(start, end + 1):
    div_opens = len(re.findall(r'<div\b[^>]*>', lines[i]))
    div_closes = len(re.findall(r'</div\s*>', lines[i]))
    if div_opens > 0 or div_closes > 0:
        pass
        # print(f"L{i}: +{div_opens} -{div_closes} | {lines[i].strip()}")

section_text = '\n'.join(lines[start:end+1])
opens = len(re.findall(r'<div\b[^>]*>', section_text))
closes = len(re.findall(r'</div\s*>', section_text))
print("Total opens:", opens, "Total closes:", closes)
