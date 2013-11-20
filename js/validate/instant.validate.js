/**
 * Плагин занимается валидацией полей формы на странице, по определенному конфигу
 * При валидации, если есть ошибки в поле - они выводятся ниже поля в отдельном
 * блоке. Валидация полей происходит при любом изменении в переданных для
 * валидации полях (события onKeyUp и onChange).
 * Пример конфига:
 * {
 * 	login : {
 * 		notEmpty : { message: 'Username is required and cannot be empty'},
 *		length : { min : 3, message : 'Value should be at least 3 symbols' }
 * 	},
 * 	password : {
 * 		notEmpty : { message: 'Password is required and cannot be empty' }
 * 	},
 * 	confirm_password : {
 * 		notEmpty : { message: 'You must enter a password confirmation' },
 *		checkPasswordMatch : function (fieldName, value, pluginConfig) {
 *			return value != $('[name="password"]').val() ? 'Passwords should match' : true;
 *		}
 * 	}
 * }
 */
(function( $ ) {
	var options = {
		// Объект, к которому приаттачен плагин
		form : {},
		// Конфиг валидации
		config : {},
		// Флаг статуса валидации
		isValid : false,
		// Дефолтное сообщение валидации, если не определено в конфиге плагина валидации, или если closure не вернул строку
		defaultErrorMessage : 'Validation result negative',
		// Метод возвращает поле по его имени из конфига, можно переопределить
		getField : function(fieldName) { return options.form.find('[name="'+fieldName+'"]'); },
		// Метод, котоый будет выполняться при изменении поля (события onkeyup и onchange)
		onChange : false
	};

	var methods = {
		init : function(config) {
			options = $.extend(options, config);
			options.form = $(this);

			if (typeof options.onChange == 'function') {
				methods.setOnChange(options.onChange);
			}
			return this;
		},
		validate : function() {
			options.isValid = false;
			methods.clear();
			var errorsStack = {};

			for (var fieldName in options.config) {
				var validateConfig = options.config[fieldName],
					field = options.getField(fieldName);

				for (var pluginName in validateConfig) {
					var pluginConfig = validateConfig[pluginName],
						result = true,
						value = field.val(),
						message = '';

					if (typeof pluginConfig == 'function') {
						result = pluginConfig(fieldName, value, pluginConfig);
						if (!result || typeof result == 'string') {
							message = result ? result : options.defaultErrorMessage;
							result = false;
						}
					} else {
						if (!plugins[pluginName]) continue;
						result = plugins[pluginName](fieldName, value, pluginConfig);
						if (!result) {
							message = !pluginConfig.message ? options.defaultErrorMessage : pluginConfig.message;
						}
					}
					if (!result) {
						if (!errorsStack[fieldName]) errorsStack[fieldName] = {object: field, messages : []};
						errorsStack[fieldName].messages.push(message);
					}
				}
			}

			if (Object.keys(errorsStack).length == 0) {
				options.isValid = true;
				return this;
			} else {
				options.isValid = false;
			}

			for (var errorFieldName in errorsStack) {
				var data = errorsStack[errorFieldName],
					fieldObj = data.object,
					errorContainer = $('<div class="iv-error-container"></div>');

				if (data.messages.length == 1) {
					errorContainer.html(data.messages[0]);
				} else {
					var errorsList = $('<ul></ul>');
					$(data.messages).each(function(i, message) {
						errorsList.append('<li>'+message+'</li>');
					});
					errorContainer.append(errorsList);
				}

				fieldObj.addClass('iv-error-field').parent().append(errorContainer);
			}

			return this;
		},
		clear : function()
		{
			options.form.find('.iv-error-container').remove();
			options.form.find('.iv-error-field').removeClass('iv-error-field');
			return this;
		},
		isValid : function() {
			return options.isValid;
		},
		setOnChange : function(onChange) {
			var fieldNames = Object.keys(options.config);
			$(fieldNames).each(function(i, fieldName) {
				var field = options.getField(fieldName);
				if (field.length == 0) return;
				field.keyup(function(e) { onChange(e);}).change(function(e) { onChange(e); });
			});
		}
	};

	/**
	 * Плагины валидации
	 * @type {{notEmpty: notEmpty, length: length, interval: interval, regex: regex}}
	 */
	var plugins = {
		/**
		 * Проверяет на то, что поле непустое (длина значения должна быть больше нуля)
		 * @param fieldName 	- Имя валидируемого поля
		 * @param value 		- Значение для валидации
		 * @param pluginConfig 	- Конфиг плагина валидации
		 */
		notEmpty : function(fieldName, value, pluginConfig) {
			return value.length > 0;
		},
		/**
		 * Проверяет на длину строки
		 */
		length : function(fieldName, value, pluginConfig) {
			var min = (!pluginConfig.min) ? 0 : pluginConfig.min,
				max = (!pluginConfig.min) ? false : pluginConfig.max;
			return max && (value.length >= min && value.max <= max) || !max && value.length >= min;
		},
		/**
		 * Проверяет, что значение, переведенное во float, попадает в интервал
		 */
		interval : function(fieldName, value, pluginConfig) {
			value = parseFloat(value);
			if (isNaN(value)) value = 0;
			var min = (!pluginConfig.min) ? 0 : pluginConfig.min,
				max = (!pluginConfig.min) ? false : pluginConfig.max;
			return max && value >= min && value <= max || !max && value >= min
		},
		/**
		 * Валидирует по регулярному выражению
		 */
		regex : function(fieldName, value, pluginConfig) {
			var pattern = new RegExp((!pluginConfig.pattern) ? '' : pluginConfig.pattern);
			return value.match(pattern);
		},
		/**
		 * Валидирует по регулярному выражению
		 */
		compare : function(fieldName, value, pluginConfig) {
			value = parseFloat(value);
			var operator = (!pluginConfig.operator) ? '=' : pluginConfig.operator,
				etalon =(!pluginConfig.etalon) ? 0 : pluginConfig.etalon,
				result = false;
			switch (operator) {
				case '='	: result = value == etalon; break;
				case '==='	: result = value === etalon; break;
				case '>='	: result = value >= etalon; break;
				case '<='	: result = value <= etalon; break;
				case '>'	: result = value > etalon; break;
				case '<'	: result = value < etalon; break;
				case '!='	: result = value != etalon; break;
				default: result = value === etalon;
			}
			return result;
		}
	};
	/**
	 * Запускалка методов
	 * @param method
	 * @returns {*}
	 */
	$.fn.instantValidate = function(method) {
		// логика вызова метода
		if ( methods[method] ) {
			return methods[ method ].apply( this, Array.prototype.slice.call( arguments, 1 ));
		} else if ( typeof method === 'object' || ! method ) {
			return methods.init.apply( this, arguments );
		} else {
			$.error( 'Method named '+method+' does not exists in jQuery.instantValidate' ); return false;
		}
	};
}( jQuery ));