#!/bin/bash

echo "📋 D1データ移行スクリプト"
echo "========================"
echo ""

# カラー設定
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

SOURCE_DB="pawmatch-db"
TARGET_DB="buddies-db"

echo "📊 ソース: $SOURCE_DB"
echo "📊 ターゲット: $TARGET_DB"
echo ""

# 1. ペットデータをエクスポート
echo -e "${YELLOW}🔄 ペットデータをエクスポート中...${NC}"
npx wrangler d1 execute $SOURCE_DB --remote --command "
SELECT
  id, type, name, breed, age, gender,
  prefecture, city, location, description,
  personality, medicalInfo, careRequirements, goodWith,
  healthNotes, color, weight, size, coatLength,
  isNeutered, isVaccinated, vaccinationStatus, isFivFelvTested,
  exerciseLevel, trainingLevel, socialLevel, indoorOutdoor,
  groomingRequirements, goodWithKids, goodWithDogs, goodWithCats,
  apartmentFriendly, needsYard, imageUrl, hasJpeg, hasWebp,
  imageCheckedAt, screenshotRequestedAt, screenshotCompletedAt,
  shelterName, shelterContact, sourceUrl, sourceId, adoptionFee,
  createdAt, updatedAt
FROM pets
" --json > /tmp/pets_export.json

# 2. JSONデータを整形してSQL文を生成
echo -e "${YELLOW}🔄 SQLインサート文を生成中...${NC}"
cat /tmp/pets_export.json | jq -r '.[0].results[] |
  "INSERT INTO pets VALUES (" +
  (if .id then "\"" + .id + "\"" else "NULL" end) + "," +
  (if .type then "\"" + .type + "\"" else "NULL" end) + "," +
  (if .name then "\"" + (.name | gsub("\""; "\\\"")) + "\"" else "NULL" end) + "," +
  (if .breed then "\"" + .breed + "\"" else "NULL" end) + "," +
  (if .age then "\"" + .age + "\"" else "NULL" end) + "," +
  (if .gender then "\"" + .gender + "\"" else "NULL" end) + "," +
  (if .prefecture then "\"" + .prefecture + "\"" else "NULL" end) + "," +
  (if .city then "\"" + .city + "\"" else "NULL" end) + "," +
  (if .location then "\"" + .location + "\"" else "NULL" end) + "," +
  (if .description then "\"" + (.description | gsub("\""; "\\\"") | gsub("\n"; "\\n")) + "\"" else "NULL" end) + "," +
  (if .personality then "\"" + .personality + "\"" else "NULL" end) + "," +
  (if .medicalInfo then "\"" + .medicalInfo + "\"" else "NULL" end) + "," +
  (if .careRequirements then "\"" + .careRequirements + "\"" else "NULL" end) + "," +
  (if .goodWith then "\"" + .goodWith + "\"" else "NULL" end) + "," +
  (if .healthNotes then "\"" + .healthNotes + "\"" else "NULL" end) + "," +
  (if .color then "\"" + .color + "\"" else "NULL" end) + "," +
  (if .weight then "\"" + .weight + "\"" else "NULL" end) + "," +
  (if .size then "\"" + .size + "\"" else "NULL" end) + "," +
  (if .coatLength then "\"" + .coatLength + "\"" else "NULL" end) + "," +
  (.isNeutered | tostring) + "," +
  (.isVaccinated | tostring) + "," +
  (if .vaccinationStatus then "\"" + .vaccinationStatus + "\"" else "NULL" end) + "," +
  (.isFivFelvTested | tostring) + "," +
  (if .exerciseLevel then "\"" + .exerciseLevel + "\"" else "NULL" end) + "," +
  (if .trainingLevel then "\"" + .trainingLevel + "\"" else "NULL" end) + "," +
  (if .socialLevel then "\"" + .socialLevel + "\"" else "NULL" end) + "," +
  (if .indoorOutdoor then "\"" + .indoorOutdoor + "\"" else "NULL" end) + "," +
  (if .groomingRequirements then "\"" + .groomingRequirements + "\"" else "NULL" end) + "," +
  (.goodWithKids | tostring) + "," +
  (.goodWithDogs | tostring) + "," +
  (.goodWithCats | tostring) + "," +
  (.apartmentFriendly | tostring) + "," +
  (.needsYard | tostring) + "," +
  (if .imageUrl then "\"" + .imageUrl + "\"" else "NULL" end) + "," +
  (.hasJpeg | tostring) + "," +
  (.hasWebp | tostring) + "," +
  (if .imageCheckedAt then "\"" + .imageCheckedAt + "\"" else "NULL" end) + "," +
  (if .screenshotRequestedAt then "\"" + .screenshotRequestedAt + "\"" else "NULL" end) + "," +
  (if .screenshotCompletedAt then "\"" + .screenshotCompletedAt + "\"" else "NULL" end) + "," +
  (if .shelterName then "\"" + .shelterName + "\"" else "NULL" end) + "," +
  (if .shelterContact then "\"" + .shelterContact + "\"" else "NULL" end) + "," +
  (if .sourceUrl then "\"" + .sourceUrl + "\"" else "NULL" end) + "," +
  (if .sourceId then "\"" + .sourceId + "\"" else "NULL" end) + "," +
  (.adoptionFee | tostring) + "," +
  (if .createdAt then "\"" + .createdAt + "\"" else "CURRENT_TIMESTAMP" end) + "," +
  (if .updatedAt then "\"" + .updatedAt + "\"" else "CURRENT_TIMESTAMP" end) +
  ");"
' > /tmp/pets_insert.sql

# 3. データをインポート
echo -e "${YELLOW}🔄 データをターゲットDBにインポート中...${NC}"
if npx wrangler d1 execute $TARGET_DB --remote --file=/tmp/pets_insert.sql; then
  echo -e "${GREEN}✅ データ移行が完了しました！${NC}"
else
  echo -e "${RED}❌ データ移行中にエラーが発生しました${NC}"
  exit 1
fi

# 4. データ件数を確認
echo ""
echo -e "${YELLOW}📊 移行結果を確認中...${NC}"
echo "ソースDB ($SOURCE_DB):"
npx wrangler d1 execute $SOURCE_DB --remote --command "SELECT COUNT(*) as count FROM pets"

echo ""
echo "ターゲットDB ($TARGET_DB):"
npx wrangler d1 execute $TARGET_DB --remote --command "SELECT COUNT(*) as count FROM pets"

echo ""
echo -e "${GREEN}✅ D1データ移行が完了しました！${NC}"