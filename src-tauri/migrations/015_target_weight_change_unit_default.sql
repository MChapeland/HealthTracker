UPDATE settings
SET target_weight_change_unit = 'month'
WHERE target_weight_change_unit IS NULL
   OR TRIM(target_weight_change_unit) = ''
   OR target_weight_change_unit NOT IN ('day', 'week', 'month', 'year');
