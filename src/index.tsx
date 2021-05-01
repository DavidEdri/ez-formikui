import * as React from "react";
import { AxiosResponse } from "axios";
import ReCAPTCHA from "react-google-recaptcha";
import Grid, { GridProps } from "@material-ui/core/Grid";
import {
  Typography,
  CircularProgress,
  Button,
  TypographyProps,
} from "@material-ui/core";
import {
  Formik,
  Form,
  FormikValues,
  FormikHelpers,
  FormikErrors,
} from "formik";
import config from "./config";
import {
  changeText,
  fieldsToInitialValues,
  getSubmitMethod,
  setCaptchaKey,
  inputSwitch,
} from "./functions";
import { captchaValidation } from "./helpers";
import { InputGrid, SubmitMethods, FieldType } from "./types";
import { OtherComponentProps } from "./inputs/Other";
import { EZArray } from "./inputs/Array"; // causing dependency error

export { changeText, setCaptchaKey };

export type OtherComponent = OtherComponentProps;

export type AfterDefaultSubmit<T = any> = (
  res: AxiosResponse<T>,
  actions: FormikHelpers<FormikValues>,
) => void | Promise<any>;

export type FormikSubmit = (
  values: FormikValues,
  actions: FormikHelpers<FormikValues>,
) => void | Promise<any>;

export type Fields = FieldType[];

type Props = {
  fields: Fields;
  validationSchema?: any;
  validate?: (
    values: FormikValues,
  ) => object | Promise<FormikErrors<FormikValues>>;
  onSubmit: FormikSubmit | string;
  submitMethod?: SubmitMethods;
  title?: string;
  paragraph?: string;
  useCaptcha?: boolean;
  afterDefaultSubmit?: AfterDefaultSubmit;
  gridProps?: GridProps;
  submitProps?: {
    grid?: InputGrid;
    text?: string;
    other?: { style?: React.CSSProperties };
  };
  typographyProps?: {
    title?: TypographyProps;
    paragraph?: TypographyProps;
  };
};

const EZFormikUI: React.FC<Props> = ({
  fields,
  validationSchema,
  validate,
  onSubmit,
  submitMethod = "post",
  title = undefined,
  paragraph = undefined,
  useCaptcha = false,
  afterDefaultSubmit = undefined,
  gridProps = {
    alignItems: "center",
    direction: "row",
    justify: "space-between",
    spacing: 1,
  },
  submitProps = { grid: { xs: 12 } },
  typographyProps = { paragraph: {}, title: {} },
}) => {
  const { text, captchaKey } = config;
  const initialValues = fieldsToInitialValues(fields);
  const recaptchaRef: any = React.useRef({});
  const { title: titleProps, paragraph: paragraphProps } = typographyProps;

  if (useCaptcha) {
    initialValues.captcha = "";
  }

  const submitHandler: FormikSubmit = async (values, actions) => {
    if (useCaptcha && recaptchaRef.current!.getValue() === "") {
      // reset captcha
      actions.setFieldValue("captcha", "");
    } else {
      try {
        if (typeof onSubmit === "string") {
          // default submit
          const axiosMethod = getSubmitMethod(submitMethod);
          const res = await axiosMethod(onSubmit, values);

          if (afterDefaultSubmit) {
            afterDefaultSubmit(res, actions);
          }
        } else {
          await onSubmit(values, actions);
        }
      } catch (error) {
        if (useCaptcha) {
          recaptchaRef.current!.reset();
        }
        actions.setErrors(error.response.data);
      }
    }
  };

  if (useCaptcha && captchaKey === "") {
    return (
      <Typography align="center" color="error" paragraph gutterBottom>
        Error: must set captcha key in order to use captcha
      </Typography>
    );
  }

  return (
    <Formik
      initialValues={initialValues}
      validationSchema={validationSchema}
      onSubmit={submitHandler}
      validate={(values) => {
        const captchaError = useCaptcha ? captchaValidation(values) : {};
        const otherErrors = validate ? validate(values) : {};

        return { ...captchaError, ...otherErrors };
      }}
    >
      {({ errors, touched, setFieldValue, isSubmitting }) => (
        <>
          {title && (
            <Typography
              align="center"
              variant="h3"
              paragraph
              gutterBottom
              {...titleProps}
            >
              {title}
            </Typography>
          )}

          {paragraph && (
            <Typography
              align="center"
              variant="subtitle1"
              color="textSecondary"
              {...paragraphProps}
            >
              {paragraph}
            </Typography>
          )}

          <Form>
            {errors.general && (
              <Typography align="center" color="error" paragraph gutterBottom>
                {errors.general}
              </Typography>
            )}
            <Grid container {...gridProps}>
              {fields.map((f, i) => {
                if (f.type !== "array")
                  // separated because causing dependency cycle
                  return inputSwitch(f, i, setFieldValue, text);
                return (
                  <EZArray
                    key={f.fieldName}
                    name={f.fieldName}
                    setFieldValue={setFieldValue}
                    of={f.of}
                    label={f.label}
                    max={f.max}
                    startEmpty={f.startEmpty}
                    newItemText={f.newItemText}
                    grid={f.grid}
                    text={text}
                    componentProps={f.props}
                    rowProps={f.rowProps}
                  />
                );
              })}

              {useCaptcha && (
                <Grid
                  item
                  xs={12}
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    marginBottom: 5,
                  }}
                >
                  <ReCAPTCHA
                    ref={recaptchaRef}
                    sitekey={captchaKey}
                    onChange={(e) => {
                      setFieldValue("captcha", e);
                    }}
                  />
                  <Typography
                    color="error"
                    hidden={!(errors.captcha && touched.captcha)}
                  >
                    {text.checkCaptcha}
                  </Typography>
                </Grid>
              )}
              <Grid item {...submitProps.grid}>
                <Button
                  style={{ marginTop: 5 }}
                  variant="contained"
                  color="primary"
                  disabled={isSubmitting}
                  type="submit"
                  fullWidth
                  endIcon={isSubmitting && <CircularProgress size={20} />}
                  {...submitProps.other}
                >
                  {submitProps.text || text.submit}
                </Button>
              </Grid>
            </Grid>
          </Form>
        </>
      )}
    </Formik>
  );
};

export default EZFormikUI;
