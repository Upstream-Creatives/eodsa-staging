-- Certificate Generation Helper Script
-- This script helps identify which performances need certificates generated

-- 1. Find all scored performances that don't have certificates
WITH scored_performances AS (
  SELECT 
    p.id as performance_id,
    p.item_number,
    p.title,
    p.contestant_id,
    p.eodsa_id,
    c.name as contestant_name,
    c.studio_name,
    COUNT(DISTINCT s.judge_id) as judges_scored,
    AVG(s.technical_score + s.musical_score + s.performance_score + s.styling_score + s.overall_impression_score) as average_score,
    ROUND(AVG(s.technical_score + s.musical_score + s.performance_score + s.styling_score + s.overall_impression_score), 2) as percentage
  FROM performances p
  JOIN contestants c ON p.contestant_id = c.id
  JOIN scores s ON s.performance_id = p.id
  WHERE p.scores_published = true
  GROUP BY p.id, p.item_number, p.title, p.contestant_id, p.eodsa_id, c.name, c.studio_name
  HAVING COUNT(DISTINCT s.judge_id) >= 3  -- At least 3 judges scored
)
SELECT 
  sp.performance_id,
  sp.item_number,
  sp.title,
  sp.contestant_name,
  sp.studio_name,
  sp.percentage,
  CASE 
    WHEN sp.percentage >= 90 THEN 'Gold'
    WHEN sp.percentage >= 80 THEN 'Silver'
    WHEN sp.percentage >= 70 THEN 'Bronze'
    ELSE 'Participation'
  END as medallion,
  CASE 
    WHEN cert.id IS NULL THEN '❌ NO CERTIFICATE'
    ELSE '✅ HAS CERTIFICATE'
  END as certificate_status
FROM scored_performances sp
LEFT JOIN certificates cert ON cert.performance_id = sp.performance_id
ORDER BY sp.item_number;

-- 2. Specific check for Items 44 and 63
SELECT 
  p.id as performance_id,
  p.item_number,
  p.title,
  c.name as contestant_name,
  c.studio_name,
  COUNT(DISTINCT s.judge_id) as judges_scored,
  ROUND(AVG(s.technical_score + s.musical_score + s.performance_score + s.styling_score + s.overall_impression_score), 2) as percentage,
  CASE 
    WHEN cert.id IS NULL THEN '❌ NO CERTIFICATE'
    ELSE '✅ HAS CERTIFICATE'
  END as certificate_status
FROM performances p
JOIN contestants c ON p.contestant_id = c.id
JOIN scores s ON s.performance_id = p.id
LEFT JOIN certificates cert ON cert.performance_id = p.id
WHERE p.item_number IN (44, 63)
GROUP BY p.id, p.item_number, p.title, c.name, c.studio_name, cert.id
ORDER BY p.item_number;

-- 3. Check MOVE Dance Company entries
SELECT 
  p.id as performance_id,
  p.item_number,
  p.title,
  c.name as contestant_name,
  c.studio_name,
  COUNT(DISTINCT s.judge_id) as judges_scored,
  ROUND(AVG(s.technical_score + s.musical_score + s.performance_score + s.styling_score + s.overall_impression_score), 2) as percentage,
  CASE 
    WHEN cert.id IS NULL THEN '❌ NO CERTIFICATE'
    ELSE '✅ HAS CERTIFICATE'
  END as certificate_status
FROM performances p
JOIN contestants c ON p.contestant_id = c.id
JOIN scores s ON s.performance_id = p.id
LEFT JOIN certificates cert ON cert.performance_id = p.id
WHERE c.studio_name ILIKE '%MOVE%' OR c.name ILIKE '%MOVE%'
GROUP BY p.id, p.item_number, p.title, c.name, c.studio_name, cert.id
ORDER BY p.item_number;
