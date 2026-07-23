package dto

type CreateRestaurantRequest struct {
	Name        string `json:"name"        validate:"required,min=1,max=200"`
	Description string `json:"description" validate:"max=2000"`
	ImageURL    string `json:"image_url"   validate:"max=500"`
}

type UpdateRestaurantRequest struct {
	Name        string `json:"name"        validate:"max=200"`
	Description string `json:"description" validate:"max=2000"`
	ImageURL    string `json:"image_url"   validate:"max=500"`
	IsActive    *bool  `json:"is_active"`
}

type CreateFoodRequest struct {
	CategoryID  string  `json:"category_id"  validate:"required"`
	Name        string  `json:"name"         validate:"required,min=1,max=200"`
	Description string  `json:"description"  validate:"max=1000"`
	Price       float64 `json:"price"        validate:"required,gt=0,lte=99999"`
	ImageURL    string  `json:"image_url"    validate:"max=500"`
}

type UpdateFoodRequest struct {
	CategoryID  string  `json:"category_id"`
	Name        string  `json:"name"         validate:"max=200"`
	Description string  `json:"description"  validate:"max=1000"`
	Price       float64 `json:"price"        validate:"lte=99999"`
	ImageURL    string  `json:"image_url"    validate:"max=500"`
	IsAvailable *bool   `json:"is_available"`
}

type CreateCourierRequest struct {
	UserID string `json:"user_id" validate:"required"`
	Name   string `json:"name"    validate:"required,min=1,max=100"`
	Phone  string `json:"phone"   validate:"required,phone,max=20"`
}
