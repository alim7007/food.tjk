package main

import (
	"context"
	"fmt"
	"log/slog"
	"os"

	"github.com/caarlos0/env/v11"
	"golang.org/x/crypto/bcrypt"

	"nexara.food/internal/database"
)

type seedConfig struct {
	DatabaseURL string `env:"DATABASE_URL,required"`
}

func main() {
	slog.SetDefault(slog.New(slog.NewTextHandler(os.Stderr, &slog.HandlerOptions{Level: slog.LevelInfo})))

	var cfg seedConfig
	if err := env.Parse(&cfg); err != nil {
		slog.Error("failed to load config", "error", err)
		os.Exit(1)
	}

	ctx := context.Background()
	pool, err := database.NewPool(ctx, cfg.DatabaseURL)
	if err != nil {
		slog.Error("failed to connect to database", "error", err)
		os.Exit(1)
	}
	defer pool.Close()

	slog.Info("clearing old seed data")
	_, err = pool.Exec(ctx, `TRUNCATE order_items, orders, foods, categories, couriers, refresh_tokens, users, restaurants CASCADE`)
	if err != nil {
		slog.Error("failed to truncate", "error", err)
		os.Exit(1)
	}

	hash, _ := bcrypt.GenerateFromPassword([]byte("pass1234"), 12)
	passHash := string(hash)

	slog.Info("seeding categories")
	categories := []struct {
		name  string
		order int
	}{
		{"Шаурма", 1}, {"Бургеры", 2}, {"Пицца", 3}, {"Гарниры", 4}, {"Напитки", 5}, {"Десерты", 6},
	}
	catIDs := make(map[string]string)
	for _, c := range categories {
		var id string
		pool.QueryRow(ctx, `INSERT INTO categories (name, display_order) VALUES ($1,$2) RETURNING id`, c.name, c.order).Scan(&id)
		catIDs[c.name] = id
	}

	type foodSeed struct {
		name, desc, cat, image string
		price                  float64
	}

	type restaurantSeed struct {
		name, desc, image string
		foods             []foodSeed
	}

	restaurants := []restaurantSeed{
		{
			name: "Шаурма Кинг", desc: "Лучшая шаурма в городе — курица, говядина и фалафель в лаваше.",
			image: "/uploads/shawarma_main.png",
			foods: []foodSeed{
				{"Супер Шаурма", "Большая шаурма с двойной порцией мяса", "Шаурма", "/uploads/shawarma1.png", 28},
				{"Куриная Шаурма", "Маринованная курица в лаваше с чесночным соусом", "Шаурма", "/uploads/shawarma2.png", 20},
				{"Говяжья Шаурма", "Пряная говядина с тахини и соленьями", "Шаурма", "/uploads/shawarma3.png", 24},
			},
		},
		{
			name: "Белла Наполи", desc: "Настоящая итальянская пицца, домашняя паста и классические десерты.",
			image: "/uploads/pizza_main.png",
			foods: []foodSeed{
				{"Маргарита", "Классический томатный соус, моцарелла и базилик", "Пицца", "/uploads/pizza1.png", 35},
				{"Пепперони", "Острая пепперони с расплавленной моцареллой", "Пицца", "/uploads/pizza2.png", 40},
				{"Тирамису", "Классический итальянский десерт с кофе", "Десерты", "/uploads/pizza3.png", 18},
			},
		},
		{
			name: "Бургер Хаус", desc: "Премиум бургеры с отборными ингредиентами и домашними соусами.",
			image: "/uploads/burger_main.png",
			foods: []foodSeed{
				{"Классический Бургер", "Говяжья котлета с салатом, помидором и соусом", "Бургеры", "/uploads/burger1.png", 22},
				{"Чизбургер", "Двойной сыр с жареным луком", "Бургеры", "/uploads/burger2.png", 26},
				{"Барбекю Бургер", "Соус барбекю с хрустящим беконом и чеддером", "Бургеры", "/uploads/burger3.png", 30},
			},
		},
	}

	totalFoods := 0
	for _, r := range restaurants {
		var restID string
		pool.QueryRow(ctx,
			`INSERT INTO restaurants (name, description, image_url) VALUES ($1,$2,$3) RETURNING id`,
			r.name, r.desc, r.image,
		).Scan(&restID)

		for _, f := range r.foods {
			pool.Exec(ctx,
				`INSERT INTO foods (restaurant_id, category_id, name, description, price, image_url, is_available)
				 VALUES ($1,$2,$3,$4,$5,$6,true)`,
				restID, catIDs[f.cat], f.name, f.desc, f.price, f.image,
			)
			totalFoods++
		}
	}

	slog.Info("seeding users")
	users := []struct{ name, email, role string }{
		{"Администратор", "admin@nexara.com", "admin"},
		{"Амир Каримов", "amir@example.com", "customer"},
		{"Бахтиёр Назаров", "bakhtiyor@example.com", "customer"},
		{"Олимджон Хасанов", "olimjon@example.com", "courier"},
		{"Парвина Умарова", "parvina@example.com", "courier"},
		{"Курбон Ашуров", "qurbon@example.com", "courier"},
	}

	for _, u := range users {
		pool.Exec(ctx,
			`INSERT INTO users (email, password_hash, name, role) VALUES ($1,$2,$3,$4)`,
			u.email, passHash, u.name, u.role,
		)
	}

	slog.Info("seeding courier profiles")
	courierPhones := []string{"+992900000001", "+992900000002", "+992900000003"}
	ci := 0
	for _, u := range users {
		if u.role != "courier" {
			continue
		}
		var userID string
		pool.QueryRow(ctx, `SELECT id FROM users WHERE email = $1`, u.email).Scan(&userID)
		pool.Exec(ctx,
			`INSERT INTO couriers (user_id, name, phone) VALUES ($1, $2, $3)`,
			userID, u.name, courierPhones[ci],
		)
		ci++
	}

	fmt.Printf("\nСид завершён: %d ресторанов, %d категорий, %d блюд, %d пользователей\n",
		len(restaurants), len(categories), totalFoods, len(users))
	fmt.Println("Все пароли: pass1234")
	fmt.Println("Админ: admin@nexara.com / pass1234")
}
