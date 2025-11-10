# Check Missing Performances by Performance Type

## Query: What performance types are missing?

Run this to see if the 79 missing entries are all Solo or mixed:

```sql
-- Check performance type of entries WITHOUT performances
SELECT 
  CASE 
    WHEN jsonb_array_length(participant_ids::jsonb) = 1 THEN 'Solo'
    WHEN jsonb_array_length(participant_ids::jsonb) = 2 THEN 'Duet'
    WHEN jsonb_array_length(participant_ids::jsonb) = 3 THEN 'Trio'
    WHEN jsonb_array_length(participant_ids::jsonb) >= 4 THEN 'Group'
    ELSE 'Unknown'
  END as performance_type,
  entry_type,
  approved,
  COUNT(*) as count
FROM event_entries ee
LEFT JOIN performances p ON p.event_entry_id = ee.id
WHERE p.id IS NULL
GROUP BY 
  CASE 
    WHEN jsonb_array_length(participant_ids::jsonb) = 1 THEN 'Solo'
    WHEN jsonb_array_length(participant_ids::jsonb) = 2 THEN 'Duet'
    WHEN jsonb_array_length(participant_ids::jsonb) = 3 THEN 'Trio'
    WHEN jsonb_array_length(participant_ids::jsonb) >= 4 THEN 'Group'
    ELSE 'Unknown'
  END,
  entry_type,
  approved
ORDER BY approved DESC, performance_type;
```

---

## Alternative if participant_ids is TEXT not JSONB:

If the above gives an error, try this:

```sql
-- Check performance type of entries WITHOUT performances (TEXT version)
SELECT 
  CASE 
    WHEN array_length(string_to_array(trim(both '[]' from participant_ids), ','), 1) = 1 THEN 'Solo'
    WHEN array_length(string_to_array(trim(both '[]' from participant_ids), ','), 1) = 2 THEN 'Duet'
    WHEN array_length(string_to_array(trim(both '[]' from participant_ids), ','), 1) = 3 THEN 'Trio'
    WHEN array_length(string_to_array(trim(both '[]' from participant_ids), ','), 1) >= 4 THEN 'Group'
    ELSE 'Unknown'
  END as performance_type,
  entry_type,
  approved,
  COUNT(*) as count
FROM event_entries ee
LEFT JOIN performances p ON p.event_entry_id = ee.id
WHERE p.id IS NULL
GROUP BY 
  CASE 
    WHEN array_length(string_to_array(trim(both '[]' from participant_ids), ','), 1) = 1 THEN 'Solo'
    WHEN array_length(string_to_array(trim(both '[]' from participant_ids), ','), 1) = 2 THEN 'Duet'
    WHEN array_length(string_to_array(trim(both '[]' from participant_ids), ','), 1) = 3 THEN 'Trio'
    WHEN array_length(string_to_array(trim(both '[]' from participant_ids), ','), 1) >= 4 THEN 'Group'
    ELSE 'Unknown'
  END,
  entry_type,
  approved
ORDER BY approved DESC, performance_type;
```

---

## Simplified Version:

If the above are too complex, just check a sample:

```sql
-- Show first 20 missing entries with participant count
SELECT 
  ee.id,
  ee.item_name,
  ee.entry_type,
  ee.participant_ids,
  ee.approved,
  ee.payment_status
FROM event_entries ee
LEFT JOIN performances p ON p.event_entry_id = ee.id
WHERE p.id IS NULL AND ee.approved = true
ORDER BY ee.created_at DESC
LIMIT 20;
```

Look at the `participant_ids` column:
- `["id1"]` = Solo (1 participant)
- `["id1","id2"]` = Duet (2 participants)
- `["id1","id2","id3"]` = Trio (3 participants)
- `["id1","id2","id3","id4"]` or more = Group (4+ participants)

---

## Quick Check: Total entries by performance type

```sql
-- All entries (with and without performances) by type
SELECT 
  CASE 
    WHEN participant_ids LIKE '%,%,%,%' THEN 'Group (4+)'
    WHEN participant_ids LIKE '%,%,%' THEN 'Trio (3)'
    WHEN participant_ids LIKE '%,%' THEN 'Duet (2)'
    ELSE 'Solo (1)'
  END as performance_type,
  COUNT(*) as total_entries,
  COUNT(p.id) as has_performance,
  COUNT(*) - COUNT(p.id) as missing_performance
FROM event_entries ee
LEFT JOIN performances p ON p.event_entry_id = ee.id
GROUP BY 
  CASE 
    WHEN participant_ids LIKE '%,%,%,%' THEN 'Group (4+)'
    WHEN participant_ids LIKE '%,%,%' THEN 'Trio (3)'
    WHEN participant_ids LIKE '%,%' THEN 'Duet (2)'
    ELSE 'Solo (1)'
  END
ORDER BY performance_type;
```

This will show:
- Solo: X total, Y missing
- Duet: X total, Y missing
- Trio: X total, Y missing
- Group: X total, Y missing

---

Run the **Quick Check** query first - it's the simplest and will tell us if the 79 missing performances include Duets/Trios/Groups or if they're all Solos.

