with open('/Users/su/Desktop/code/项目/零碳项目收益评估软件前端/components/ProjectEntry.tsx', 'r') as f:
    lines = f.readlines()

new_lines = []
for i, line in enumerate(lines):
    # Skip extra closes
    if i in [655, 1143, 1144]:
        print(f"Skipping L{i+1}: {line.strip()}")
        continue
    new_lines.append(line)

with open('/Users/su/Desktop/code/项目/零碳项目收益评估软件前端/components/ProjectEntry.tsx', 'w') as f:
    for line in new_lines:
        f.write(line)
print('Fixed!')
