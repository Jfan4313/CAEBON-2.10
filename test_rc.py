with open('/Users/su/Desktop/code/项目/零碳项目收益评估软件前端/components/ReportCenter.tsx', 'r') as f:
    text = f.read()

import re
if re.search(r'<DetailedReport\b', text):
    print("DetailedReport is rendered.")
else:
    print("DetailedReport is NOT rendered.")
