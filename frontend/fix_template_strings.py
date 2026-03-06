import re

with open('src/pages/admin/ProjectDetails.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Remove markdown code block at the beginning
content = re.sub(r'^```[a-z]*\n', '', content)
content = re.sub(r'\n```$', '', content)

# Fix specific corrupted template strings
replacements = [
    ("'/ responses / project / ${ id } '", "`/responses/project/${id}`"),
    ("'/ responses / ${ responseId } '", "`/responses/${responseId}`"),
    ("'/ responses / ${ respId } '", "`/responses/${respId}`"),
    ("'/ projects / ${ id } '", "`/projects/${id}`"),
    ("'/ projects / ${ project.id } / generate_areas_grids '", "`/projects/${project.id}/generate_areas_grids`"),
    ("'${ count } adet kaydı silmek istediğinize emin misiniz ? '", "`${count} adet kaydı silmek istediğinize emin misiniz?`"),
    ("'${ count } kayıt başarıyla silindi.'", "`${count} kayıt başarıyla silindi.`"),
    ("'GPKG olarak indiriliyor: ${ gpkg.name } '", "`GPKG olarak indiriliyor: ${gpkg.name}`"),
    ("'${ baseUrl }?${ params.toString() } '", "`${baseUrl}?${params.toString()}`"),
    ("'User_${ resp.user_id } '", "`User_${resp.user_id}`"),
    ("'Geometri: ${ value.type } '", "`Geometri: ${value.type}`"),
    ("'/ public / forms / ${ id } '", "`/public/forms/${id}`"),
]

for old, new in replacements:
    content = content.replace(old, new)

with open('src/pages/admin/ProjectDetails.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

print('Fixed!')
