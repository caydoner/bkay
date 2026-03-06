import re

file_path = r'c:\Users\caydoner\Desktop\BKAY\paydas_analizi\app_v1\frontend\src\pages\admin\ProjectDetails.tsx'

with open(file_path, 'r', encoding='utf-8') as f:
    code = f.read()

# 1. Extract Column Modal Content
column_modal_pattern = r'\{\s*isColumnModalOpen && \(\s*<div className="fixed inset-0[^>]+>\s*(<div className="glass-panel border-white/5 w-full max-w-md[^>]*>.*?</div>)\s*</div>\s*\)\s*\}\s*'
column_match = re.search(column_modal_pattern, code, re.DOTALL)
if not column_match:
    print("Column modal not found!")
    exit(1)
column_modal_content = column_match.group(1)
# Remove the extracted column modal from the bottom
code = code.replace(column_match.group(0), '')

# 2. Extract Form Modal Content
form_modal_pattern = r'\{\s*isFormModalOpen && \(\s*<div className="fixed inset-0[^>]+>\s*(<div className="glass-panel border-white/5 w-full max-w-md[^>]*>.*?</div>)\s*</div>\s*\)\s*\}\s*'
form_match = re.search(form_modal_pattern, code, re.DOTALL)
if not form_match:
    print("Form modal not found!")
    exit(1)
form_modal_content = form_match.group(1)
# Remove the extracted form modal from the bottom
code = code.replace(form_match.group(0), '')

# 3. Inject Column Modal into Table Tab
# Find the table tab content
table_tab_pattern = r'(\{activeTab === \'table\' && \(\s*<div className="w-\[600px\] max-w-full glass-panel [^>]+>)(.*?)(\s*</div>\s*\)\s*\})'
table_tab_match = re.search(table_tab_pattern, code, re.DOTALL)

if table_tab_match:
    wrapper_start = table_tab_match.group(1)
    inner_content = table_tab_match.group(2)
    wrapper_end = table_tab_match.group(3)
    
    # We will wrap the inner_content in `!isColumnModalOpen ? (<>{inner_content}</>) : ({column_modal_content})`
    # Also adjust the modal body so it spans 100% width and height as it's no longer a max-w-md popup
    adjusted_column_modal = column_modal_content.replace('w-full max-w-md', 'w-full h-full flex flex-col')
    adjusted_column_modal = adjusted_column_modal.replace('max-h-[80vh] overflow-y-auto', 'flex-1 overflow-y-auto')
    
    new_table_tab = f"{wrapper_start}\n                            {{isColumnModalOpen ? (\n                                {adjusted_column_modal}\n                            ) : (\n                                <>\n{inner_content}\n                                </>\n                            )}}{wrapper_end}"
    code = code[:table_tab_match.start()] + new_table_tab + code[table_tab_match.end():]
else:
    print("Table tab not found!")
    exit(1)

# 4. Inject Form Modal into Forms Tab
form_tab_pattern = r'(\{activeTab === \'forms\' && \(\s*<div className="w-\[800px\] max-w-full glass-panel [^>]+>)(.*?)(\s*</div>\s*\)\s*\})'
form_tab_match = re.search(form_tab_pattern, code, re.DOTALL)

if form_tab_match:
    wrapper_start = form_tab_match.group(1)
    inner_content = form_tab_match.group(2)
    wrapper_end = form_tab_match.group(3)
    
    adjusted_form_modal = form_modal_content.replace('w-full max-w-md', 'w-full max-w-2xl mx-auto flex flex-col')
    
    new_form_tab = f"{wrapper_start}\n                            {{isFormModalOpen ? (\n                                {adjusted_form_modal}\n                            ) : (\n                                <>\n{inner_content}\n                                </>\n                            )}}{wrapper_end}"
    code = code[:form_tab_match.start()] + new_form_tab + code[form_tab_match.end():]
else:
    print("Forms tab not found!")
    exit(1)

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(code)

print("Modals successfully convert to inline accordions/panels!")
