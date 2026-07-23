package handler

import (
	"fmt"
	"html"
	"regexp"
	"strings"

	"github.com/go-playground/validator/v10"
)

var phoneRegex = regexp.MustCompile(`^\+?[0-9]{7,15}$`)

func NewValidator() *validator.Validate {
	v := validator.New()
	v.RegisterValidation("phone", func(fl validator.FieldLevel) bool {
		val := fl.Field().String()
		if val == "" {
			return true
		}
		return phoneRegex.MatchString(val)
	})
	return v
}

func formatValidationError(err error) string {
	if validationErrors, ok := err.(validator.ValidationErrors); ok {
		var msgs []string
		for _, e := range validationErrors {
			msgs = append(msgs, fmt.Sprintf("field '%s' %s", e.Field(), e.Tag()))
		}
		return strings.Join(msgs, "; ")
	}
	return err.Error()
}

func sanitize(s string) string {
	s = html.EscapeString(s)
	s = strings.TrimSpace(s)
	if len(s) > 5000 {
		s = s[:5000]
	}
	return s
}

func sanitizePtr(s *string) *string {
	if s == nil {
		return nil
	}
	cleaned := sanitize(*s)
	return &cleaned
}
