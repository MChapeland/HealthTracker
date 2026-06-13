//! Default food library (USDA-style approximations per reference amount).
//! Auto-populated once per database (see settings.food_library_auto_populated).

use rusqlite::{Connection, Result};

/// (name, reference_quantity, reference_unit, calories, protein, carbs, fat, fiber, salt grams)
type SeedRow = (
    &'static str,
    f64,
    &'static str,
    f64,
    f64,
    f64,
    f64,
    f64,
    f64,
);

const FOODS: &[SeedRow] = &[
    // Poultry & meat (per 100 g, cooked unless noted)
    ("Chicken breast, cooked", 100.0, "g", 165.0, 31.0, 0.0, 3.6, 0.0, 0.08),
    ("Chicken thigh, cooked", 100.0, "g", 209.0, 26.0, 0.0, 11.0, 0.0, 0.09),
    ("Turkey breast, cooked", 100.0, "g", 135.0, 30.0, 0.0, 1.0, 0.0, 0.07),
    ("Ground beef, 90% lean", 100.0, "g", 250.0, 26.0, 0.0, 17.0, 0.0, 0.09),
    ("Ground beef, 15% fat", 100.0, "g", 212.0, 18.0, 0.0, 15.0, 0.0, 0.08),
    ("Beef sirloin, cooked", 100.0, "g", 183.0, 27.0, 0.0, 8.0, 0.0, 0.06),
    ("Pork chop, cooked", 100.0, "g", 231.0, 25.0, 0.0, 14.0, 0.0, 0.07),
    ("Bacon, cooked", 100.0, "g", 541.0, 37.0, 1.4, 42.0, 0.0, 3.2),
    ("Ham, deli", 100.0, "g", 145.0, 21.0, 1.5, 6.0, 0.0, 2.0),
    ("Lamb, cooked", 100.0, "g", 294.0, 25.0, 0.0, 21.0, 0.0, 0.06),
    ("Turkey sausage", 100.0, "g", 196.0, 14.0, 3.0, 14.0, 0.0, 1.2),
    ("Deli turkey breast", 100.0, "g", 104.0, 17.0, 4.0, 2.0, 0.0, 1.8),
    // Fish & seafood (per 100 g)
    ("Salmon, Atlantic cooked", 100.0, "g", 206.0, 22.0, 0.0, 13.0, 0.0, 0.09),
    ("Tuna, canned in water", 100.0, "g", 116.0, 26.0, 0.0, 0.8, 0.0, 0.47),
    ("Cod, cooked", 100.0, "g", 105.0, 23.0, 0.0, 0.9, 0.0, 0.08),
    ("Shrimp, cooked", 100.0, "g", 99.0, 24.0, 0.2, 0.3, 0.0, 0.37),
    ("Sardines, canned", 100.0, "g", 208.0, 25.0, 0.0, 11.0, 0.0, 0.5),
    ("Tilapia, cooked", 100.0, "g", 128.0, 26.0, 0.0, 2.7, 0.0, 0.08),
    // Eggs & dairy
    ("Egg, large", 1.0, "serving", 78.0, 6.3, 0.6, 5.3, 0.0, 0.14),
    ("Egg white", 1.0, "serving", 17.0, 3.6, 0.2, 0.1, 0.0, 0.16),
    ("Whole milk", 1.0, "serving", 149.0, 8.0, 12.0, 8.0, 0.0, 0.15),
    ("Skim milk", 100.0, "g", 34.0, 3.4, 5.0, 0.1, 0.0, 0.05),
    ("Greek yogurt, plain nonfat", 100.0, "g", 59.0, 10.0, 3.6, 0.4, 0.0, 0.04),
    ("Yogurt, plain whole milk", 100.0, "g", 61.0, 3.5, 4.7, 3.3, 0.0, 0.05),
    ("Cheddar cheese", 100.0, "g", 403.0, 25.0, 1.3, 33.0, 0.0, 1.8),
    ("Mozzarella cheese", 100.0, "g", 280.0, 28.0, 2.2, 17.0, 0.0, 0.7),
    ("Cottage cheese, 2%", 100.0, "g", 84.0, 11.0, 3.4, 2.3, 0.0, 0.35),
    ("Butter", 100.0, "g", 717.0, 0.9, 0.1, 81.0, 0.0, 0.02),
    ("Cream cheese", 100.0, "g", 342.0, 6.0, 4.1, 34.0, 0.0, 0.35),
    // Grains & starches
    ("White rice, cooked", 100.0, "g", 130.0, 2.7, 28.0, 0.3, 0.4, 0.001),
    ("Brown rice, cooked", 100.0, "g", 123.0, 2.7, 26.0, 1.0, 1.8, 0.001),
    ("Pasta, cooked", 100.0, "g", 131.0, 5.0, 25.0, 1.1, 1.8, 0.003),
    ("Oats, dry rolled", 100.0, "g", 389.0, 17.0, 66.0, 7.0, 10.6, 0.003),
    ("Oatmeal, cooked", 100.0, "g", 71.0, 2.5, 12.0, 1.5, 1.7, 0.002),
    ("White bread", 100.0, "g", 265.0, 9.0, 49.0, 3.2, 2.7, 1.0),
    ("Whole wheat bread", 100.0, "g", 252.0, 13.0, 41.0, 4.2, 6.0, 0.9),
    ("Flour tortilla", 1.0, "serving", 140.0, 4.0, 22.0, 4.0, 2.0, 0.45),
    ("Quinoa, cooked", 100.0, "g", 120.0, 4.4, 21.0, 1.9, 2.8, 0.005),
    ("Couscous, cooked", 100.0, "g", 112.0, 3.8, 23.0, 0.2, 1.4, 0.01),
    ("Potato, baked with skin", 100.0, "g", 93.0, 2.5, 21.0, 0.1, 2.2, 0.005),
    ("Sweet potato, baked", 100.0, "g", 86.0, 1.6, 20.0, 0.1, 3.0, 0.07),
    ("Corn flakes cereal", 100.0, "g", 357.0, 7.0, 84.0, 0.4, 3.0, 1.1),
    ("Bagel, plain", 1.0, "serving", 289.0, 11.0, 56.0, 2.0, 2.3, 0.95),
    // Legumes & soy
    ("Black beans, cooked", 100.0, "g", 132.0, 8.9, 24.0, 0.5, 8.7, 0.002),
    ("Chickpeas, cooked", 100.0, "g", 164.0, 8.9, 27.0, 2.6, 7.6, 0.007),
    ("Lentils, cooked", 100.0, "g", 116.0, 9.0, 20.0, 0.4, 7.9, 0.002),
    ("Kidney beans, cooked", 100.0, "g", 127.0, 8.7, 23.0, 0.5, 7.4, 0.002),
    ("Tofu, firm", 100.0, "g", 144.0, 17.0, 3.0, 9.0, 2.0, 0.008),
    ("Edamame", 100.0, "g", 122.0, 11.0, 10.0, 5.0, 5.0, 0.01),
    // Vegetables (per 100 g)
    ("Broccoli, cooked", 100.0, "g", 34.0, 2.8, 7.0, 0.4, 2.6, 0.03),
    ("Spinach, raw", 100.0, "g", 23.0, 2.9, 3.6, 0.4, 2.2, 0.08),
    ("Carrot, raw", 100.0, "g", 41.0, 0.9, 10.0, 0.2, 2.8, 0.07),
    ("Tomato, raw", 100.0, "g", 18.0, 0.9, 3.9, 0.2, 1.2, 0.003),
    ("Onion, raw", 100.0, "g", 40.0, 1.1, 9.3, 0.1, 1.7, 0.005),
    ("Bell pepper, raw", 100.0, "g", 31.0, 1.0, 6.0, 0.3, 2.1, 0.005),
    ("Cucumber, raw", 100.0, "g", 15.0, 0.7, 3.6, 0.1, 0.5, 0.002),
    ("Romaine lettuce", 100.0, "g", 17.0, 1.2, 3.3, 0.3, 2.1, 0.03),
    ("Mushrooms, raw", 100.0, "g", 22.0, 3.1, 3.3, 0.3, 1.0, 0.005),
    ("Zucchini, cooked", 100.0, "g", 17.0, 1.2, 3.1, 0.4, 1.0, 0.003),
    ("Green beans, cooked", 100.0, "g", 35.0, 1.9, 8.0, 0.1, 3.4, 0.006),
    ("Cauliflower, raw", 100.0, "g", 25.0, 1.9, 5.0, 0.3, 2.0, 0.03),
    ("Avocado", 100.0, "g", 160.0, 2.0, 9.0, 15.0, 7.0, 0.007),
    ("Mixed salad greens", 100.0, "g", 15.0, 1.4, 2.9, 0.2, 1.5, 0.03),
    // Fruits
    ("Banana, medium", 1.0, "serving", 105.0, 1.3, 27.0, 0.4, 3.1, 0.001),
    ("Apple, medium", 1.0, "serving", 95.0, 0.5, 25.0, 0.3, 4.4, 0.002),
    ("Orange, medium", 1.0, "serving", 62.0, 1.2, 15.0, 0.2, 3.1, 0.001),
    ("Strawberries", 100.0, "g", 32.0, 0.7, 7.7, 0.3, 2.0, 0.001),
    ("Blueberries", 100.0, "g", 57.0, 0.7, 14.0, 0.3, 2.4, 0.001),
    ("Grapes", 100.0, "g", 69.0, 0.7, 18.0, 0.2, 0.9, 0.002),
    ("Watermelon", 100.0, "g", 30.0, 0.6, 8.0, 0.2, 0.4, 0.001),
    ("Mango", 100.0, "g", 60.0, 0.8, 15.0, 0.4, 1.6, 0.001),
    ("Pineapple", 100.0, "g", 50.0, 0.5, 13.0, 0.1, 1.4, 0.001),
    ("Raisins", 100.0, "g", 299.0, 3.1, 79.0, 0.5, 3.7, 0.03),
    // Nuts, seeds & spreads
    ("Almonds", 100.0, "g", 579.0, 21.0, 22.0, 50.0, 12.5, 0.001),
    ("Walnuts", 100.0, "g", 654.0, 15.0, 14.0, 65.0, 6.7, 0.002),
    ("Peanuts, roasted", 100.0, "g", 567.0, 26.0, 16.0, 49.0, 8.5, 0.005),
    ("Peanut butter", 100.0, "g", 588.0, 25.0, 20.0, 50.0, 6.0, 0.47),
    ("Almond butter", 100.0, "g", 614.0, 21.0, 19.0, 56.0, 10.0, 0.01),
    ("Chia seeds", 100.0, "g", 486.0, 17.0, 42.0, 31.0, 34.0, 0.005),
    ("Sunflower seeds", 100.0, "g", 584.0, 21.0, 20.0, 51.0, 9.0, 0.003),
    // Oils & fats
    ("Olive oil", 100.0, "g", 884.0, 0.0, 0.0, 100.0, 0.0, 0.0),
    ("Coconut oil", 100.0, "g", 862.0, 0.0, 0.0, 100.0, 0.0, 0.0),
    ("Mayonnaise", 100.0, "g", 680.0, 1.0, 0.6, 75.0, 0.0, 0.6),
    // Snacks & sweets
    ("Potato chips", 100.0, "g", 536.0, 7.0, 53.0, 35.0, 4.8, 1.5),
    ("Dark chocolate 70%", 100.0, "g", 598.0, 7.8, 46.0, 43.0, 11.0, 0.02),
    ("Milk chocolate", 100.0, "g", 535.0, 7.6, 59.0, 30.0, 3.4, 0.08),
    ("Honey", 100.0, "g", 304.0, 0.3, 82.0, 0.0, 0.2, 0.003),
    ("Granola", 100.0, "g", 489.0, 10.0, 64.0, 20.0, 8.0, 0.3),
    ("Protein bar", 1.0, "serving", 200.0, 20.0, 22.0, 7.0, 3.0, 0.35),
    ("Whey protein powder", 1.0, "serving", 120.0, 24.0, 3.0, 1.5, 0.0, 0.2),
    ("Ice cream, vanilla", 100.0, "g", 207.0, 3.5, 24.0, 11.0, 0.7, 0.15),
    ("Cookies, chocolate chip", 1.0, "serving", 148.0, 1.6, 20.0, 7.0, 0.8, 0.35),
    // Beverages (per 100 ml)
    ("Coffee, black", 100.0, "g", 1.0, 0.1, 0.0, 0.0, 0.0, 0.003),
    ("Tea, unsweetened", 100.0, "g", 1.0, 0.0, 0.2, 0.0, 0.0, 0.003),
    ("Orange juice", 100.0, "g", 45.0, 0.7, 10.0, 0.2, 0.2, 0.001),
    ("Cola, regular", 100.0, "g", 42.0, 0.0, 11.0, 0.0, 0.0, 0.01),
    ("Beer", 100.0, "g", 43.0, 0.5, 3.6, 0.0, 0.0, 0.001),
    ("Red wine", 100.0, "g", 85.0, 0.1, 2.6, 0.0, 0.0, 0.001),
    ("Almond milk, unsweetened", 100.0, "g", 15.0, 0.6, 0.3, 1.2, 0.3, 0.15),
    ("Coconut water", 100.0, "g", 19.0, 0.7, 4.0, 0.2, 0.0, 0.04),
    // Prepared & condiments
    ("Pizza, cheese slice", 1.0, "serving", 285.0, 12.0, 36.0, 10.0, 2.5, 1.3),
    ("Hamburger, fast food", 1.0, "serving", 354.0, 17.0, 29.0, 17.0, 1.5, 1.0),
    ("French fries, medium", 1.0, "serving", 365.0, 4.0, 48.0, 17.0, 4.0, 0.6),
    ("Hummus", 100.0, "g", 166.0, 8.0, 14.0, 10.0, 6.0, 0.5),
    ("Salsa", 100.0, "g", 36.0, 1.5, 7.0, 0.2, 1.8, 1.0),
    ("Soy sauce", 100.0, "g", 53.0, 8.0, 5.0, 0.1, 0.8, 15.0),
    ("Ketchup", 100.0, "g", 112.0, 1.3, 26.0, 0.2, 0.3, 1.5),
    ("Mustard", 100.0, "g", 66.0, 4.0, 5.0, 4.0, 3.0, 2.0),
    ("Caesar dressing", 100.0, "g", 542.0, 3.0, 4.0, 58.0, 0.0, 1.2),
    ("Ranch dressing", 100.0, "g", 430.0, 1.0, 6.0, 45.0, 0.0, 0.9),
    ("Soup, chicken noodle", 100.0, "g", 39.0, 2.4, 4.8, 1.2, 0.5, 0.45),
    ("Sushi roll, salmon avocado", 1.0, "serving", 304.0, 13.0, 42.0, 9.0, 2.0, 0.9),
    ("Burrito, bean and cheese", 1.0, "serving", 420.0, 15.0, 55.0, 14.0, 8.0, 1.1),
    ("Chicken stir-fry with rice", 1.0, "serving", 450.0, 28.0, 52.0, 14.0, 3.0, 1.2),
    ("Caesar salad with chicken", 1.0, "serving", 320.0, 28.0, 10.0, 18.0, 3.0, 0.9),
    ("Oatmeal with banana", 1.0, "serving", 280.0, 9.0, 48.0, 6.0, 6.0, 0.15),
    ("Smoothie, berry yogurt", 1.0, "serving", 220.0, 8.0, 38.0, 4.0, 3.0, 0.12),
    ("Trail mix", 100.0, "g", 462.0, 14.0, 45.0, 29.0, 5.0, 0.25),
    ("Popcorn, air-popped", 100.0, "g", 387.0, 13.0, 78.0, 5.0, 15.0, 0.008),
    ("Rice cakes, plain", 1.0, "serving", 35.0, 0.7, 7.3, 0.3, 0.4, 0.08),
];

fn already_populated(conn: &Connection) -> Result<bool> {
    let flag: i64 = conn.query_row(
        "SELECT food_library_auto_populated FROM settings WHERE id = 1",
        [],
        |r| r.get(0),
    )?;
    Ok(flag != 0)
}

/// Inserts default foods that are not already in the library (matched by name), then marks
/// auto-populate as done so this never runs again.
pub fn populate_if_needed(conn: &Connection) -> Result<()> {
    if already_populated(conn)? {
        return Ok(());
    }

    let mut insert = conn.prepare(
        "INSERT INTO foods (name, reference_quantity, reference_unit, calories, protein, carbs, fat, fiber, salt, micronutrients)
         SELECT ?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, NULL
         WHERE NOT EXISTS (SELECT 1 FROM foods WHERE name = ?1)",
    )?;

    for row in FOODS {
        insert.execute(rusqlite::params![
            row.0, row.1, row.2, row.3, row.4, row.5, row.6, row.7, row.8
        ])?;
    }

    conn.execute(
        "UPDATE settings SET food_library_auto_populated = 1 WHERE id = 1",
        [],
    )?;

    Ok(())
}
