-- Rebalance daily score weights to 100 after teeth brushing added a fourth default weight.
UPDATE settings
SET
    score_weight_calories = 60,
    score_weight_walking = 20,
    score_weight_workout = 10,
    score_weight_teeth = 10
WHERE score_weight_calories = 70
  AND score_weight_walking = 20
  AND score_weight_workout = 10
  AND score_weight_teeth = 10;
