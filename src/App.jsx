import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  LayoutDashboard, Users, Home, Sprout, ClipboardList, Plus, X, Trash2,
  Pencil, Search, Phone, MapPin, Calendar, Leaf, Wheat, ChevronRight,
  ArrowLeft, AlertTriangle, Settings, FlaskConical, Package, UserCog, Mail,
  Bug, Microscope, Flower2, History, Wallet, Receipt, Repeat
} from "lucide-react";
import { MapContainer, TileLayer, Polygon, Tooltip, LayersControl, CircleMarker, ImageOverlay, useMapEvents } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { safeGet, safeSet } from "./lib/storage.js";
import {
  getSession, onAuthStateChange, signIn, signOut, getMyProfile,
  listProfiles, createColaborador, updateColaborador, deleteColaborador,
  createClientAccess, updateClientAccess, deleteClientAccess, fetchClientPortalData,
  setTeamRole, fetchBBExtrato
} from "./lib/auth.js";
import { supabase } from "./lib/supabaseClient.js";

const LOGO_SRC = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAaQAAACICAYAAACoVZ/MAAA5gUlEQVR42u2dd7xkRZXHv6ffmwgMQ4YBkSwioCMgWcU1EBRMiCjGNWzCrKAuyOIaWEXFZdeMrhgQUYIIkpGgDFlQcoaRzAADw8y8ef3bP+4pXs2lw733dffr11O/z6c//cK9t+pWnTqpTp1jJCQkJCQkjAOSDDAAM6s3+P8QsDKwCjALWBVYDVgJmAHUgD9ZGsqEhISEhE4JIUnDwBxgc2ArYEtgfWAtF0KzgJnANGDYhZEBnxlOw5qQkJCQUFYQuRCS/20VYBtgd2AXF0TPc6FTBKPAI0kgJSQkJCSUFkSSai6E9gH2ArZ162e524LQimC5/xvwJHB7EkgJCQkJCWUE0WrAa4G3Ai8H1m4igCz6NH28//8RYH4SSAkJCQkJzYRRLRJEawJvAt4L7AgM+WX1EgKoGe4FHkwCKSEhISGhqVUkaTpwAPCvwA7RZXUXPrUONHmnmT2TBFJCQkJCwnLCyMzkVtFc4DBg35xF1ClBFKypGyALuUtISEhI6J3lkXHijOn3W/9qbhXVgIOA/wA2igRRrUOCCMb2j0aBmxJ1JCQkJEwg8/eP9Ut//Hs1ScdIWqoMo5Lq6jzCMx+Q9MJkISUkJCT0lunPJMtY8KiZjeaFAaCJsJwiy+j5wLfJXHSxVdSVZt1CuhW4JwmkhISEhN4w/LAv81EyV9j1kuYBlwLXm9kzOeHUM8EUCaPNgR8Du9LZfaJ2uNLMno6EckJCQkJCNwWSf/8057Z6VNK5kj4n6cV5QdFtd17Ur00kXRK56LqNevR5R85KTEhISEjoAeM/1hn+SIN9mftdYO0taUbOYupmn9aR9IceCqN4/+h+SVsngZSQkJDQO4EUAga+nGP8df85FgSLJf1O0p6eJbvj1pIk82dOlfQjb3fZOCydsgjve7qkqaFPSSIlJCQk9A4Lcr+HfZoa2SZ/nSwh6euBk4DjJb3UzOpmpg4KpZAK6H1kmReqBC+EfaYQul2qff8+38yW+j6WEnkkJCQk9M5Cem9BqyO2mOZLOtjLOozbtRX1ZUd/tkpaOXH/Fvre06MlnhOueVjSS+M+JQspISEhoXeYDywNsqGF9RAsplGy2kLfAr4iaaZHxFWylPw+SVoZONKfXad4/rk4+u5W4OvAQmA2Y2Hcbbvh35cA17cZi4SEhISELllI27hlUMYqia2lH3rtIaoIpagf7/M9o9EKVtGI9+NVkn49jn2nD3bC4ktISEhIKG+ZIGldSTdUiGiLgwe+L2mmByZYhT6sIWleiT7Ebd8k6QB/j19WcPeF9m6RtFFVwZqQkJCQMH6BNCzpjIoh1rGVckSIlKtgHb0zSgdUL2GdnShpYxeGJ1ZMKxSed3QSRgkJCQkTL5S+OY4zP0GILJT0+qJMPWp7mqRTC7Yf/r9A0qclTW8gjKr0/TFJO8dCMiEhISGhtwIpWCjvKujqqrcRFJdIml1EKEVtb18wIi60caukN/q9M6MzS1USroZn/swtRUsWUkJCQsLECqStPcN1M6GwzC2gVkIjuO/+uYilEbX92QLPDf/7o6QdImH03+M4DBvueULSHsk6SkhISJhYgRTcZlM9Q0Ezt1dd0p8k/bnFNeFvV0pao5WVlGv3zDbtBkFzvKT1/L7pkr7RocwMyTpKSEhI6DMr6aNNLJV67jDsdU0ESBAMI5Le0sriiNrcWNJdLZ4X8F1Js/yeaZL+M5cMdTx1j3ZM1lFCQkJCfwmkF0j6exMmH4TFzyW9VtI9TYRI+P0nrSyOqM09JS1pIIDq0fmi/wyJXf2Zh7oLsaowivv5uVaWXEJCQkJC74VSSGz6nTbWz2IXIq9tcpg23HezpA2aMftIIH2ijTA6PCRz9es/JOmpCmeN8vthknS2V6JNrrqEhISEPrSS5rqgqbdw3f1Z0gxJB0palPtfPcoO/pr42U3a/X6DTONyq+kLvrcT+vYGD88eT0mKcN9tkua2619CQkJCwsRYSCHQ4KstSj8EgfEJv/awqFRFXij9SyOGnwto+EODkO2lkj4jaSiXdPXODgmj+ZL2TMIoISEhoY+Fkn+v7RF1rQIN7pL0oiZuvvD9tTYCaVWPyFO0JzQi6ci41pKk50u6bJzCaFkkjN6QhFFCQkJC/wulYJHsJumhNoELv/GIt9mSTon+F5j/8bEAaiCQnifpjpyF9KUoBLuWy8JQtVhf6O+dkvZOwighISFh8gml9/heUF4oxeHd74usmHmRy02SfpsXQrnnb+d7QsHqOtoFnEVVaQ9tUL22rItOki6U9LIkjBISEhIml0CK95M+00QoxdF0W0QC5pbomtOj5zQSSK+LQr5/HIV2h6J/b/UsClWyd4frH5f0dUnrJGGUkJCQMIkFk39/QNIjEbMfzbnCfiJpql+7V3Tt6ZHwiQVSsH729+vOkrRWThjt3OKsU5GKtpJ0QQheSMIoISEhYXAspd0lXZoTAMv8s1jS/tF9/+jX/D4v3HIW0r9IukbSxjlh9HxJV7cRRvVICOWtp8v9vNLs/HskJCQkJExuwRQEyNq+p/O3BgLimpBnzq/9tpeUaOSyC397maSX5qymVSWdFB2MHW3waeS+e1DSyZLeH6ytZBUlJCQkDLBQ8p/X84CHUzwXXIh+OzayclaRtEMRgRBCvP1c0g8L7hMt8dDz0yR9TNKLcxkdap2yipJplZCQkNB/QskAM7O6/z4MbA5sAWwG1IEfAE+bmQo+L2P6ZvLAg88CzwMUfUaBZ4AngMeA+4G7gTuBe8xsaU5wqkj7HRFIg2iChQkeD5EMEt23IqZxvG9HibTbWmi332vA6GZC57YDPGnCabPkOwTaGc33O3pOuKYUbzOzegPabDo+fm2wjJT/7tq4dtIEGxRtJflHExLdJCR0V240PNUbJJ2kjYCXAlsC0xv1IfpWg7+3kvhN36vJtdbk9/g91OC9BCwDpgKXmNnpkqyoNJdUi8zmVYEX+2c9YDhn7io3FmrzrrU2c2ItrNl2E19rMVd1n89fmtm8/HiE3yVtBrwfmBJpX/H71bwf4ZlDwOPAcWb2QJlx7qEbBO/ngT6Pow1oN7xr3T8GLAKON7P5Rd4rRzfreFtbA7OdbmoNtMwi82oFf7c2z1DBdsJ8DznNnG1mp/ZybiN6XBl4N7C+z0utyZoPvKEW0eiQu6C+Bzwc87kev8Ns4D3AGsBIg3VqUZ+twZwp4iu1JjykHd2MtuHdYQ0oN74WtTcKLAXuBa4DbjKzZfG7Vhmn4fyA+c/bAf8I7Ak8v8RL9zu2kfR7J4zCTMUF0dt9MbwEmDkg4/EQMK8Bgwq/b0PmZy6L9SV9JBtC0UdCyXw+9wd+5IK2DK4B5rdj6E5bdY+EejfwTjLf/7QBoJkZwKm9njcf732A/xnns5aY2X+F/Y8JeId1gC8CqwyQcfQQcJGk44CznPZrVbZHhnPSewj4GHAIsFZ0XX0SDEor4gra1LKC2mEsjLYBjgZe00CLmIxjEY/HSJvrRnJanBVo14APABeY2UkTsPDbzefzgMNdGC0roGzFmmStRDuvBL4ObNfDdaQmykXee6BxPHtRr61aH88pwLsiuhwq+ajRYBlL+pGZPTpBFvwo8FSk1FqX178V9NZURQ1YG3irKwzHS/qCe0hKC6XhOD25S+5Pe8dHowU4CBbSUNEJiRbBi4Hj3VKITeXJvkltOXdHK2Ibiq4t8s51Mvfof0i6yszunGjXXe58xifIXND12ENQgBHXC7QThNFrgJ8C60b32SRfR/XIlTQR1tEOwG7+83CFfoTrtwHeAPxkHMJ5vAx8yD9iMIJdAm+cAXwIeIGkfzKzm8qu/Zq7MQR8HPhMRHxDA8B4y1oOsbU4h8zfvI0LZ5ugBdnX49WEpurAVsAhbiFN9JiF8Nm9gA9WZARF3btbAse6MApK3SDRjSaovbcDq46DiQfhMwQcJGlGFGWW0DkFdxR4BfBDSXPC9khh5uGTsjtjewWFXBOTWMsrGrP/aWDHyNRfUQltPFrtu4D9gk95Aq0j+YnyI4CVOq2ZRm0Mk7kDtxhgulnaRVdTIyEvSRu6O6hT1tYuwO69eo8VjF8MOe3vChxWdt3XfBH9s2sf9QEWRoUXALAtcNCAC+deCKSZwBGSNphAbTT2AOzQJRoPbewM7DvgdDM6AW2+EdikA+Ma6HKGW0k1VySSUOosgrX0DmBHVypqRW98IbAH/b1J32vsDazJ4Ph4J8L9Elx32wKfDgfwern4Izfa7q50dWs+wzju1Q0LrA+9DD2xbH3uZgEHdJBeLVrjc12RsAFad/2iyAqY5YK/8F5djeyc0VpM/k3XcWn80QKouSadBHTnCPMDwL6+j9OTxR+50WaTuepmd0NQRHuOU8lcvINON6M9Xquvi9ZjrYM0uQbwthVEQEykwvtqYP2iVlIN2JSxiI8VgUG2w0yyQ6/JjB8/TcSuuy9IWruHrrvgRvsn4FWM31XXLsBnpjM5SzTRMWVimMztM6XD7YZnvVnSRmVcSsk6Kr1eNiSLai2EYaof8tQkGtx6CWKYOo4xqU+i8SiicXaCuQbX3VzgE5I+S5fDbSNX3UuAj3TwXVphiPIHbSfTOqr3sJ/BW/EyVyY6PX9hj2Mzsui9ryZFoCPKfCNldDowp4xAGq44OJMpJLzMeapwTmA87UyW8ZjaQ2IW2T7OWWZ2QdWT3CW06xnAf7i124tgnarrYbKsozB+M3rIfA8i24foxvwFHvZ2Pyj7cL+luuqCctiJObEKY1w4K8VwxYk24AHgLLJcRiOM+Zbj8zrxdztJXyQHl9r8bk2sFXPt9eJAcF0gvFHgbOAvjMXjj9J838JKMqVGuQIb5c9r1Ebch/iw6xk90r7CwdJZZK67vwALusQAgnZ9EPB6xnLR9aPGa8CjwClk6VdC3kWj+AHsVmvCWigHtKDNPD3F+eDO7CbN5M5z7dtFZhyspG2A1wI/Z2IOyhbFYrKQ+xrPPaRfxbpq9q5qwF+GGV+qo8KK73DFRXQX8H4zu4DBgyqOyfeBT5nZosn2wj3SCoPr7hXAR83sC51OKxQxs62Az0dtWofoQuP4fzN8zcyOSjTzHLyJLIlq2UCUMtcHt/XbJZ1kZkv6VGlZQnZO9GKyfIh1ymWNaSeQLFLi1eDnYbLghI+R7ZN2LTKxqkD6RXC7TMKFVO8CwTxNlgl6kW/ETpa9pF7XhgmL4F8knWlml3XKdRe56qa4MHo+vT9Xp5J0sxS4LKozU1+RaSaKdF2T5SPgrAKNWcFrITv2shtwXrdcyePEMuBPZnbVBPbhMkmPAP9NFw98D1e874GoouEoCU8DT/qY1PuQoHtlLRZhAHWyM16HS3obsKhDrrs4k/db6V9XXYx6sDYkDRLdjFdh2Y+sXEdRwRKuuw64xee/DD2u5ALwPLrvsqtqSc9wA6A2AYpLjWz74Uzg72SRc2UUBSvTUFntAxpUL1zBUU9jUoq462SlTd7bibNJkWa9MfAFxnzW1gVm0unn1RNJPCcY5e0lLZ0wLyeSubYeLDFf4fmvl7RlD0LAqwa+BO9O3cx6+ol42whj2d7LrIWhMsyhqgmZkBjLeBfmJyVtNZ5cd1EGiBpwKFkeucmSAmsyHZ3oOj0409uJLNdcUeYd9oEeA840s9uAk0oKJJGFJncyI8SgKt5VEy53VSAN8oQNcuhuv1lJGwH/7lkOqHhgNmTyfgtZMTyluZisRpJqZAdhZ1Lc5Rp40bnAdU5DPwOeoFiJlfgZB0YZqrul0KjH93WaN1o3+54EUmfGJTHAasRdJ/P3v6WK6y6KqtuQLD3Q9AkUSMnaqS6JQlLjF5ElUi1rHY0AJ3gJbQOuAi4qwauC4HoB2VGBflN4VyhNtarpNshjUkuk0XXFIyzMKW4lbVTGdRcV3RsCPkdWf6nbrjrr8HhZorXl8EbKJTUO432VW0jBYh4BfkO5wJZnD+NKmtXlFFeTVShVtZAKy4u0GDpDMEk7ri78QzG/T5VkAMFVtx/wHianq26Fd/VGASnrUj7ZaRi7k81soSszgfmdCVxPwWq/jO0l7Uh2Vq5bgqOrLq/JrthWPZiYEkgmgdTJBSoXKnsVsZIiJjYHOIyJddUNCtOYaOXv9WQuu6JZvcN830eW6SJoKXIX4EPAr0vwq0CHU4EDulwryRJ9dVYgDQ9wUasywiVcF9IEJVQXSCuTpRVaq5W7JETV+a+fBl5C/0TVVXHZrbAWUqRYrAy8k3Kpe8J1pwG3hmflrvktWYqzos8Nc/FaYOsJqpU0KLyxEoZLNhAmaLVQK919+P1m2YznNHmVEO66a1NDZFV4+yERYjikOxk0q+BqeRlZdu7DWjCRwMT2Aj5I/7jqqo5zzenG+kTJ6yXNhDneg2qh3k8Cv4yi4kKeyqDQ3Az8AXhvQToJ/VkL2J/soG2yfHtoEQ5XHPB9JB1vZvP7WPuqjUMwlfVhDwEjnrViRbeUljF2EK5KypeDJZ3fKCN4FFW3PvAlshP2Za2jwJiWUT1TSUcF8Qqc7SSkejqIzFVWdC7DHF4EXN5kzQbF5Rdk54tmFBRK4Zq3Sfqemd3XB+mEJnvwS9cEUhiU3YCTJJ0EzKdxZm8VMPUsd22tSXv5SQm5v+K2RsnOHvwduNnMHomZWJcHfHVnpDew/AlzUSwpZ6Os3Hl3jrWyCFk+w3jIbn61mf1tHKl5qiS1vAm40TXMsulF6sCqwBGSrgUez/fdNd9Pk9VXqiqM/kAWzbX9BFlYcYThOyVtwFgRuph+rAQzUhtGlqenmC7D+lhMVh7koW6XYoiUix3IqsKWsY6CQvFLM1vaZI2Hvv/JhdYrCs51sLS2INvX+m6fMPR+EEhDVK8OUVggVdXOdvJPv+Fp4BZJvwZ+ambzu7i4wkDPAD7TT5qn9+0bwCepnla/ikB6nCy56SbAdiWFRnDdvRz4WJwRPGJg+5CVRC8rSEI/bgE+DnylgkCyAhZeWXzAP/1CN3uRlZXpdimG8Oy3uRJSxjqqAVfTohRGFNzwtCvOr6BcCLgB75L0CzN7ssM8pFJFgZDLTuq5F3FI0jKy4KGVK/CGUpkaqqYBapZGQrSu06M2147ng7tx5gJfBs6QdECPfOLqg0++L+PV/KvcXzOzW10oPVWBsYXrPyppDxdCQ/69FtkB2JUoX2YAsjT+R5jZTVSrgDmodBPW8gi9KVFec4GxEVnYfpV5+LWZLYgO1bbC74E7KR8CvgNZzsVuzn9RLPXccst6ncvOzEZ8jPcB1qFaBvbCFlLV+j1515wVbNy6uMiV+94W+LGk9YBjAqF12VrqBy03aJETsTdRlzTdzM6S9B13r5U5oJh33V2PF/Nzy2b7iq66GvAL4MTceZV+cMf0Sz96fXzhjWTpo4qGeod5n08U6t30hTy4wczulHQa8NGSNDiF7KDsyWY2MgEVZQNtTAVepcw0mtpgXVsLxb+ZK7cRH44Fduw2nuUW5j+6265rYzDskzuesNl+CovMC8W6u9OOAh42s58PcLh6I2KbqAihEDH2DbIIqrJCJHbdfcrMDpX0OuDgcbjqbga+ZGajoUwICY3GvavrIwr1nkX1mkcnA7c3CfVuJmhPAN7nzLVoxB3OiHcg24vqhBuz0jEb4HCy5MGNnmG0r6bdjm9bi2dP47n7+V1552HgGuDhiqbYZFhgddcq/lPSlWZ2cxtNJ4V5jm8s6ozV+XlA0iFkaVxWpdp+zYck3UF2TmXlkoIt9H8Z8EUzuz3ai+qHserXNdMLS+wVwEsplyaoBiwA/i8f6t1aBirktzuHLAlvUYFUdwH2Xkl/7tAcV+WvQ65cTxTqVD83t6QM8d1A89DJQRJKG5FVKrUuEUxCREPRpvL5wHeotpcEsBrwv24tFXXt5JnYCYy56pTmuZB13U3raApZZvZplM9b90fg2qL8Khxu9fx2x5NV6S2aECD0a1/gRR3MAl41U8NEfqpYz+H6hYWZtdeR/xljfslBtRDkhLVBAcJKzKpDloIrAEe7y6PK3o2odq4pdtV9wRkSkWWcUmb1/h3Ds7cHXlOivXyo97KCwQx5K+l84IoS8x+spHWY+FpJNsGfKnzA3Dq6p7BA8ok6jSzNRmAYgyaUgvDZENg5MZ6eMbSgnT5KVsl1IdWj7qoshqVkrro7Crp30tz1RlmJQ73LCKTgdislGCIraSFZVdkq7/oWSet3yEpaEegwWFb3kJ1LLPTeNZ+wxcAhrsWGKIpBE0zB7HxRQeE1SIK4KuodaDO47s6lmuuuCvMIDKyRqy4pHRMglKJQ700Zq3lUtk+/LBHq3QynUy4EPNDOCymfjTzREpwB3Fc0QjEQiZnZnWQbx2cwVhMoTFo/fqoSxXoFiKpqzY9++0ykayHWTsNYfx2YRzXXXZl5qAG3A0c2cNV1WyOc7HTT7XF6O+VDvQ24yz051YhyLAT8DrIovUqWnddKGk8W8BVBmIU5ewT4cZkktcFCClrsXWQlhA8lC3ZQJJz67VM1BHNGAQZV6UBoH32G/XtaX6hJY/T1MHAk1Q7Mllnsy4CvxFF1E+Cemkx0E1LCTKEL+f2iYIaQtLQKYz7JzxM9G+rtyZ1rRT9kGQdqwKlk5y/LBjdsR5YJPFnY7degAf9rZn8pGJ4PMfGFOjRm9gRwlKSfkkU27UKW12kGjXMZqUWHyrgH1EabiLMPrERWbnil8bgkOnjQbRlZDrfH6ewBQ2vghmpFBHGbU4G/ToBW1iwaJ/jezwR+RHZIsd7hhR0UqBOB49vsG/VDUEOdLKP0Ay4M8v1qdNh8PFGiauLaDOO20N1ZnaaZ0MaewDaUq3lUAx4Ffp57Vt76LjreABdJOocsS0SZEPCQe/B3wNIJOCg7WSyjGlktqq+XfcBwI7M2+9HuB34F/MrDNKsm1uuEtM0T6LAT9zHAunQuH1mV/pkvmPeTVagcpj/238KmPhNwutyaWEnm30eTRVl1sux4eM497qpbOs69hm7TtbmW/lHgElcg2iUh7jZGzWxZp2nG+co0ski1GuWDGc4ArnPeFCfa3ZSx85OU+B4hS8JMBb7xGmBnM7uwYqCMjZNuOqXgdpInL+dxA44DDvEqvqWE9nAjxsFYmGRItTPik9hPONFzYR3V40lthBGyTBCLB9D87tiCi6zweyV9EfhJxIg7sVCDq+7GPigZUJRunvRxWTKI2nY0D68AXlmSMdZ8jE7KVRKWpG1dYX6+z7u1oNtGP0+rIJDq7pV5C3DhBCid1oH13On8lvHvNwPfAo5zhbC0BTncgnk8O6l9mG4naFlXOsFOKTHY3bCQYCyEvm/ypPWrdeCM5ddkZQfey/hdd8FyPo0sd6FNImbxLN1Iqg8gzQTl9gDK1a8K113mzD+/3g4AtpygYdpH0jf9OIH1MHlzXvDWSiiSYb9wPEIplLcJfRkhK/lzG1k4/okeHFd5O2R4goh0/BSeuX6qVHetdYEJ1bJhyvq0gvuVrY2VFFx3o5K+DOwObDqOhRKE0X3Af5jZkkliHQ083URpml5I+azZ4bpQ/iEU3KxLWpvskLvobR7OwNA3Bt4K/BfdPcYQ1sQIWUHKSxkrZJivCRffM5rji+G6twDvoXodsUfIsvjf5gJpEfAY8GDwDo2zMOqEV8zsBzN20PrR/xM25rq71YXS91i+kFyZhRII/ygzu3YSCaO2wnsQZFJkzcwpoXQEhnknWW2meLxEFoywVcRse/1OBuwv6Ydm9lhJa6DKfI+QFU68bJwKwiWu/O1WUijFpd03MbMfNVI+gsIwXg0tIWHCDF2y6KnTKB6C28g6Ohf4SUlXXTcEgfXonsliHUnSHKqHev8mhHpH1tEs1/InKvNGaHcu8OoezuEMD18fLhPqHn2GzWyBWziPVhy/GvBpSQf4HIe+mNdNUicGN1lHCRNhJYXQ3SVkRffuLblIgqb6EHCYmT0VP7fLGn+ykIpjL7IsB2VDvR8n22fMj9PLycpBTGRlgpBf8QBJU3pkkQfro2qRvZD/7yIyV2Pew1CEVkPo+5GSXtiNiMxBsJD6ofJnrwub9bvAL3RfdGD2el8kZcLlA0P6lpnNqxDibX0wVgMpkKKDsDPI0u1YyXkFOA+4JrJ6JWkYOIjORGZ2Yq5fDbwsWIRdbrPemamRAf8D/K6ClRQCtrYAviJpZvTMJJCS1TUQ4xcI+jiyUtNFohSD//si4LsTFFWX0J4GXsVY2ZAyNY9GySK2RoLQdmVjZ7e4JnqdxrWSepHfriPPjpLMPg18BrhjHEJpX+Aj/syOyZFBEEiJEU3isY0WySIy192DvuBHaVyXZdT//yRZVN2CiGFNtOKxwu8hBeVA0hBZbszplK95dAVwdoO/v9uFQL2Pxm1fSZt0sFZSV2kkCii6CTgMWFxhrQfL/lBJe3nEbEfefUXcQ7LEWPpsEscWydXA1xgLaW1UlyX8/btmdn6VqLro0HenhXeVWk8avOm0sOn/upJrI1z3KzN7PDA5Z/ZbunVUj8Z6IhPLBstiI+BNXVbyrMO8OgjPE4BjqVYSpk5WQuTLkjaOsvyMC8PRAp1URO8DOo3yoevdeNepwFTvk02W8SxgVfSSYQbX3f+SHXh8jVtD+bMWQ2Spdo4apxVXq8gYOolpwMqTiW4K0gzAgcDqVAv1PrUBXXwAWL8PPQhGlt/uJ2b2aJcOygZFrGNzKCl8H0UWBr4T5ULBg+vuJcC3JL0TeHq87z9ckMj6DaNOqVtR/vSxdZhoRFZmexszuyHZO+NmdM9I+leyMw+1yCKKy6E86H7wfqLdKhFLU4HdzOy8QZjD6CDspmSHMKF88MHvcqHekrQSWc66W8jO5FgbS8JySkerKsGKeOEqTndlLDoB2wL/QJbUt4i1MeGJfaOAokckHQKc5O9eZr7i/aTPmNnh4y2EGSyk4QaT12wgrMVgFSnpoBITk///UNTvXYEPT/DEBuIbBj4n6V7gmpzrptYNgmoyRmqhfSrHIBTCNju8cGrjZGpmZkuB+QWu0zjmbcJlsH9/SNJNZHsmS3hutnzrwJx0gpYMGClAMwBvJssxVyWr98/GeOazrthFwMEuwBv1Nx6rWCiVGbthYDZZhupXF7QWgmIxBLxX0umuUHXaSupKNGbkKr/ILaWvVVAgAg/8pKSrzeyU8RxOH5b0EbIKjooGOC71UOuQQKrC8OpNBNJMsrMNsyowmHa1lMruBYS2t3VXw01kWbYb1aS3LjAa5bTzRpq6Gvx9WNK3zOzUFgTUc4bfoPhZw1IWA5BmJ7zXHOCnZPXHnmxCJ83WV5maXiqgvauFxTcELJR0qJldl6eZXM2jA0taR+G6c4Gr8lGTPteP92BO7pZ0jLuwplG8NIXIIgp3M7Ozu1D2pMuGrWpk1Zx3JDvEXDaLQ9158tcl3WZmf60qlIbJsvDuMVm9BFQrb93u//WKfVnTiXmy4FyW99d3ktF2wn3Xjwu4GzQ8lcwXPxnwv2Q1nJox5jcALy5pHYVSKb+KtPZ63iLukYJwPlnOuH+gWDRfYMjTyNIJnTOZaDbKLblI0r87HW5Otf2kTYGjJR3gQSmVsn0vwfdkmFyRYlXN2KVtJHfIYlulP5MlaiostIWsmFCXxnR0QOkmTvK5pIGKHayjlYB3Ub7mUY2stP25zeanFyXoXRAuknSCWzxl+cvewAvM7KYu5FTsGm+OlIBbXCj9mHLh+rFQei3weUmH+piWmrtQ7C5EMk2mT9UJWhgtokYDtQhYMA6imSzjN0T3zuKsiCHwI8AzKwjdNGOWu5MdXi3DQINA/oUXdOuHoop/IMtobQW9JcFFN4cskWw3lJ5ur6m4LMz3qZbrLszlR4B3uUAu1e9mBDbIuLXRBEem6xKyE8zJUujPhdNX7x7l5FvsTGyQ8Zw95egg7DDZwdVpJayjcN1NjLmOJ0wYhbM0ZnYf8JuK9HSgpDkN9kLHS3vq8ruLsb3ZrwAXU762W3jfqcAXJW2fK6xYSCCtCNpsXDL6zwUG9NJJxly7JTwmcxRb74hrbMFdPODv3zDIyZnYDu6yqvL+p5nZ/T0sdleEdk8AHi5hKYTrtmgzDn3rmo1CwR8CDin5/vH41YENgG9KWqPModkaK0bqnSCQLgeubUEY4W/nkJ15KGqyD6pAqtO94mODZB2GZ51FFi036HTT6N33Jzu5X3bv6BGy8zt9QTsR8/wrY7WYyib8fZukGS0YcZU1Vevh+9fM7M9kh8+r7G8Gy2o34IgyB79rDH6C1bBAngaONrOnmvmpIw3hXuAHk0Gr6TJTrtMHh/j6SHhbG83y72Ths4NKN8sxxqjm0fOA11ekvQuAv4TAiP4xFmwU+BVZ9F9RxT3soexKllS20VqYDDQRZwX/LeVdd7Gl9GHgfUX3kwZdINUjRnK0mZ1egPDDZHw3Nxka0PHplRXRb6hVWGBDBejmONf4B5FuYoEUnxV6G1mocJnMzyFq7wRn/v2kxIT3+iNZ9F/RtRDGZCbwbk8wqw71p2d0FCU8XgwcDtxNNdedkdVP+pKknYvsJw3iHlKceDG83zeBo4qYjNEm9VNkp8PPZSwiLU7CuCK4Oge1rENVmm+adSOim0XAJ8nOswwa3SzXf7eOVgPeUVDBySuKV9Ai1HsCzaNg8S50K6nsWhDZOaYtG2QBnyx5LoPr7gbgs24plqXfQPvrAMdIWr/dflKcH0wD8olDaO8BPkaWZ2lRzDgKEKS5C+bdZGGQi1g+5Nwm8RjFArsVhkq+Z52JLZxWxaVQZtxqBenmPrLSC98ncxUPAt3krb0wFq8Gtmb5TBBFn/NzM3uyT0K9m+Fs4P5IkNbb0E24bm2Wz1iRtxzKjP1ECbJg9Z8IHB9ZSWX58ShZ0MtXvahf04POtRwDtwH4LAb+5lbRXmZ2jJfvLRXBE2lJ95vZh4H9yPJs3c3YwdnJOkbDBd21S3M00uqZ4SzbENUOiPZU+4vebajNe8XvPdpOm4/o5gGnm32BXwJ3MXaodLLRS3wGaYq/w6ikKW4dTS1IIxY951b6INS7jYVgwO3AyTkarxV4vxDcsG5wgUXvWnRNhf9PnQiBFFn9o2S1ky6sKCeCq/sg4OBWfNgk7Q68wBdLrcGCiTVlchpwO224bBz+eEpmi+zQ63zgRg9dfFYSV9XA8oJM0sbuL1+N7MxF/oCp5VwTavK//AFfNXBrNNKsGs1P/t5RnhvtFBP5FP/5bD+dnX9Hc8Y6m6wMxPScC5QG3zX3nd9HlrG5L4VS9G67kpW5WJpz9ebfKTCQpcAFZvZgEeUmvsZpcENgE2ANp5t2+fqsxbe1uLaZG165e+ttXGzDOYVlij/jVDO7299rCrAnsJ4rgsoxXIuE2HDU9hTgGjO7oK/9k2O0MscVixm59ZW3+GLBXSM7YH9KnEbHLYTXkkUkjhbYmwkK3tlFaa+L47A+Wb67aQ3orN6AJvPK6gxX6H8/ALkoyw9ip6oYdvJZCYkGExImIy33xCoLMeKt+kLz0EVr8P8yPs9O+Ufz/elKNugGlUaLbnRaE19y0XfrBjG0Hafofcu0rz4K3201l1UCeupV6CpHN5M1iEjR/KriOC63TicDnTRZ943WsJq5/jpAe13jaRXHYTw0XF/hrKOEhISEhISEhISEhISEhISEhISEhISEhISEhISEhISEhISEhISEhISEhISEhISEhISEhISEhISEhISEhISEhIGFp3uyNBIJCQkJCQkrMFZ4TSDKz1Q4V1RegypyX6Os42UykefyaangPbX42qLtlc2Q3iTXl0q+V5nrqTj+hctkjzdLfLNnlnle/K5Vxqbf2mpmeRSlxzLtNMpeX+QeSZsB/wicaGbXtLq3U3ygU/SSMGCmeRFTvdE13c7o3KRNG4A5qHXCXSKpNmhulgZjU+sEjU90WxNFI0X6LmmapJMlXSxpvbLrLGV2Hz+GV1jTcMxqWB1YCXjIzJa000qi+9bxPz0cinm1yZy9CrCKV6ENf5tJVhflwVaae1QG+fn+p/vMbKSN9jZMVoPnIS/HjqSVvb2/t+nrmsAzZvZ0wYW4qj93mLFaMcu87dEW71WXtBKwFrDAzJ4o0NYMsmqco2SFEheGasBt7luNrBbRXWa2rABjWR943MtYd0qpmAksKqit1/3n2X7P0oLzMJWsdtNIkXHJzcNKwCMF6Xm2X7/E+1dkDgK9L/P5M+BpM1vcahwkDQFzvJ1HC7QzxcxGcmuhXmCNrQI8CBxuZve3WV81YLbT+mIzW1zE+pY0y+fmmQLXDrej1YTBcNEhabqkQyTdKOkhSRdK2qedRSJpI0nHSbpX0nxJp0l6ZYH7jpR0u6RXRf/7J0l/k7RVM23QvzeX9EtJj0h6TNLvJW3XqM3wDEm7SbpH0gei/31O0tWSNsjfG7W1uqRLJX2plYYYXb+GpPMkPe7jcbekB31MD2qlOUp6u6TLJS3wcTi0WYnj6L3e5+81X9L9/j6fdEHV6r5DfM52aNan6Nq5km5rNwZltGZJr/Rx3afNmIRxfYWkkyTd7Br7h70gXrN5W8Np8Va/5xpJ35a0UZNxCfcNSXq/pCsk3Sfpd5Je26ZvG0o6X9Jdku6UdK2k/5S0Vhua+aqkO/y+u7y9X7mi1Oy99nB6f9Dn5MvO1PPXh3F+i6TfRBbOSpJ+LOkz7Twckg708dupWS2r6Nr9Jf3FP1dI+rWkN7fhAatJOlPSx1rQYLh2C5/PDw6KRyShNYP4kDLc5gt/oTOszfPEEpn0M/xaOZM4RVLdGeQWbYTKL/y+n0V9+Lb/7eUt2pwatXmRL05JukrS2g0W5lDE7CXpsOh/v/S/bd2gvVrEbBZJOrmgQJou6TBJp7vAlKQ/STpV0htbtLOnpKdcwP7WGYEkfaSVG0nS4X7dJZJ+6AJQkv6lzX1f9ev2LiCQ3u/XXtmIWVakt9D+cc3cTtG1WztNLXOB/ZDf+09t5u0hp+Nfu6CWj+30Fgz8AG/nekk/kfSwC/oXtWjrJZKWeFt/lHSDt/U9F3DWyLUc0e7ZTtNnSvqWW2cxTYXvzVyAPenXz/P7P9/ifY72a7b33+e4wnN+/vkNaPn//N5PFKCRI/3aW13RWODrZp8W47appGck/U8JGvxzfnwSqvtla06g4VPr8MfK9sm/p7lAeVLSjjkC+LcWBDXXF+KFkZZ2WDNmkWvzZ5JGfbHP9fE51v+2W4s2t3VC/52klX0cj/U292xw31DEaOqSDon+91NJi9swmw1cSJxYwYf+c19wLykwB8d7/94cWYH3uTCb2oLhHOb3BcGyo8/jhW3uO9Lv27OAdhoUhUckzR3Pvop/T3XmO+qCYo0C1pzcgp7mGvszroRMzT07FkiPSjol0sYvkPREXlmKGbMrDg9HVvqbve2Pt6CRrZwmfyppird1rjPljRu15T+f6Qx8dkEh/jHvywejd7rcPQ2rNBmHo3ycd/bfn+dr7uwmfQr3r+w8YVTSCS2EV3jGEX7tGyUNS3qT9/VHLWhwC6fVbxWgwWNdUXhY0ovL0mAXeG1P9mm7tofkvtd+jRCZ4fsJDwC3+UD/BtgUuDnMaYP7ZruP/iYze9L/dolfu2G7ISGrK78ucKBH8EzhubXp81jL+3tXtBf0DeB2/zTra8PIN9pXuVXU18LE7/7zZ4ChaGEtF9WW88mvCzwGzPO/3yrpRp+DVYGHmzQXxqvu43cDcDewHjALeKTKe0VRVrOAnYCnvB87AtdUXQbe7vrAFt72psALgD81mIvw84a+N3OR72teAXwcmBauabC3YT72z0gaMrMFkq4FXuG03gjTfG/mDuB2Z3jXAQuBDVq8V9gXfMz3ahZIugr4B3+/O5vcN+T7R4qqpraqILquv+9N/s4LJH0S2Mqf02gcRn2ch6NxGfaPtZijDbzvNWBrYM0WNBivr8e8zXnA34HNJE01s6UN9qBarquIBlcGtvPxWhN4KfCXkvx3UlTj7ZlAcjfBtsDq0aTLNwHDJ16ElpvouOy3fCKH/OdRYBHwVzNbWCE8cij6DPu9TwCfzwnURkQIMBxpC3X/+8wCzAnv95slfc2ZTuhPIwaKC50HgLdKOgs4y8zuAL5ZsK/5ZxZRFFRGIDmDsUhYDPnCsjZtANT82jC304ApBe8bkbShC+35wOIC429thMfmwIuAk4GdgZcB3x2ncrU9WSDGqcDewMtdILVal6PR/I56H4pgFTMbdYa/YW6tNWpnJvCoC4a6pLq3PbWFsjPUgHdM8XaWtBFks4HpRQJYorUV9s6GzOxi4OIW9yyLFJfwDHmfW9HjNsDKwNnADsALXSA1U+BC34IQWdMVx2UtxrvWZK3naXAzYEvgHBdMewA/LkODHr4+J1LE6tFYqAEvqDVRYkOfngJuLxoo0zcCKdKW3wf8lzOYWouBUAsmmieGWiSQBHwDOLxCN2vRx3LmcKHzMFG0ndowuoCpLox+BxwAvA5YkFs8yz3fBe1dkr4AHOv3/l7SN8zs/C6fUyhlnkcCSDEzbcOchqJ3jy2YIm2/3Tfs3wSsA3zPzJ4qMCbtNMetnEn/xvuyq6RVKio+4drdfO6/5oxvd+CrLbTYZwWzR4ht4tbaYuBvLe5bCmwr6V+BFwP7ucXTzJIeamA51CJrqxmCwrCZpBd4//YDbow0eTURFusA35P0qF/zbTO7rsnY1nIKW7CsWlkAow3me7QAXe3qgvlI4AS3LC8qMMcfkrST0+FqwGlmtizig40U4Xb0vbVb+8cCHwZeLmk1txBbRv65UjEH+LVb4qM5g4AmvDc2BvI8LUTNHgr8sMm79beFFFkNVpXJFcDqVeVmxABpsYCaMTNVfKcpwOnu2jgQuLxV25FQ+r6ke4GPAfsAr5L0WTM7ptuH5yo+20rOQxW8yz/4mB7boT7t7C6rP7nl9TYXUvMKuDsbuV+muIV0K3AZcBWwXRsGE2hziWvLp7vb7yrg9cDjTe5bAjwPOMYZ3/3AoWb2SIt26jlmXcu5vJp5GJY4Le4OrOJW/OfN7MlGbUXWsrmADhr771xoNhpbtRDy7ZQAa2DxW4M5qvu+3PbA1WZ2qaRbgFdK+ooLl1Zr7B3+ATgROC5SzKrwJXxMH3canOvK6+bOL4o8e8jdtDM6zA5WnXQuu0hy/tQX4UqRlLYmGkIjd0otZ0bmzcllZPs3VVCPFmJtrOttpX4rgVQrcO8UH5MTgQ+4QB1pRWBhIZjZmZLOA97oDOcISX8ws5ubaCxVFnOeIVZdUGXnoYzwCNcf5VbH4cCfzOzhNpqbtREedQ8df5lbFE87Q6+R+fDnlRyTwDjWI9s/Ottp/1ZgX7L9iisbaKRy2l7m9HIL8GWf81ktrM9RZ0DnAN8BfujvcX6bsRx1PjAUMbNa5LJrRcuXACd5X/9oZn9tpsS4cB521/hbvG91d4s1s3jqef5QYI2O5tajRe9lLVxk2wB/dBq42+doDnBPGyHweWA68O/APLekm9FhrAA0U2Cmk+1bznc32d+979tECmw73jvflbVN3GoeatD/eoP1bg2s0+C1WApcWHGdT7yF5Bvw59ADVNDiR32AVwbM9y/qHka9KAQPtGC49WjPJD+WarNQljmzeC/Z5vnSNsxyhvuT7zazx4AT3T/8JTftb25yf/AX16P9mTrNN1aV97lHbsyQ2qcdM1BOyBdh2rWof4rabyf0zna35duA/SV928yermgxBoazBbCRa4KXO6MxF0hF3H2NsI0rHvu6AFrP3XFz/fdGCHsXw04f/wf8swuBkTbr+U4zO1nSfu5G2sSFWiOmuszdgMPRPIQAgFZzOOJM7iIzOybPVFuszbAXcYOZPZyznBrhqUBTuTWqcH8DLMzdEyvCzd5pJxf2H3JhuYHP/baRQGpm3Z9BFljzfmBPScf4Hp41CTyp0XiPNN7D3ND7c7m7AQF2AX5URBj4Ov2jf/rFa1IIXUt1kQv7bhRCON5w8KFxhCEudu16JbIN1lFgY+As4FMtFsoiFyxrmZn8vrBxuKSAdi9gZTO7hmxjVs2YXCQM5gLnAf/WwrfeiGE/4X1ZzcxGnUjjU/LNLIhnmZGZ1f0zWtBn3HI/LUfIz/j4r+njOMUZ99I2TDcs3LCozyfbL3lZwfEfauO7X91dJVe6i+0RYCd3sakEzYV33dXH82J3uc3zOd9jbKqf88zHfB5m+ZjN9LF6usXYhP3V6U47pzpT27dFH5eQ7WOugQdDkEW2TXUXXKvxrAPTfB0Ou1XQjlGN5r7bMbe7vf01vG+rk+3v/KDR2apojYbAmmD9TXd6W9ZkjgLt3EwWUXmN08muLZTMmr/HdM+icam7ezdrMW7B4zO1hadlexdCfwauJ9uTexLYRdLqRWmwDe9NYd/9gGhPZomky9w0PlzSGcD+wEuAU3KMLyacW5xR7ecnv+90AWZOQO3G2iIBdJr7hqe0UQzmO5P+lKQl/oyP+wJrFaJ+I9km7Tsl3UwWPrq3v8P9Le4b9j5uIekdrqUOk4WdX93mHae00UTjoJcrXIM/QtKPfV9hO+C3wGMtiH84sh5wV9jBwFuBC9r0zZw5tRIeAg42s+u8vz9w9+rOrg239eHntOO57nZ5j7sVp7rmulO8j9SEEf+7pE2cYb4Q+GYL7XsoWHTufryCLA3O+yT90Mye3XcKqaj8ukuBVwPHeuj2ft72FS1ecZoz1Wkhoq+EwrIG8G+S7va/3QNc3CRFzlVu8RzsY7S3C/LfAMua0MitTr8f8fReryKL7Ls6TreVC7He2dfZO8zsHo/cnAfsGNL3NBjzKYEWvR9nkO037hOty0Z7O8M+fs1ocHv//ogrrkj6vtPgljQ+LtDKfZfQz4gOqT3fU97EOCXkqGtxmvuVnpolYKmk/2mR8ibcd5wfctvMf1/PDzou8iidVodqP+CHDgMe9kODQ23a/Lifpld0qnzvJveEcdlY0t+je+rR2NTatPfffvCv6UG+6Nq1PYtAjHnNDqJGbX/C2wjZLVbzrA13SFo/37/cQcYRSW/I/T0+LH2pH1xdOWiEnvFixM+/FDqcmMticb6k7/nvIXz5055V4YVN+jJL0g+ctsIc/EHSpvk+RPeu62mwvhJ5KP7Lx2qXBveFtuZ4ZocRb+tpz7iwaouxfIGnbvpCuzHJ3X+inovLPc9go0wNJumznpYq4ML8uOXumSrpi36QOKzP3zY4sBu+N/e19V3/Payp73kWkPVzzw/3HewHbrf139fxbBenNZjP8PtGfs93mnlhfJ390bPChPve6gfyDyxKg5MVtoIKpaAdres+43WB24BTCib43AzY010i1wLnxMkcm7Q1l+wsynlBG/R8dBv5fsjCNm3uQnY+og782cyuLPiur3RL8Alv+9Y2/VwZeLe7DZZFVsm1wBmNXCzRvVu6D/y8gsk2Z7uVtKFbBWea2YNt+rehtzEvOij8IrKzQ+fkI9ei+7Zwa+V8t1TyJQqm+JwuMLNLovtWcc38JjP7S5k9Kmccc8mS594XyoE4HbwYuCw6YJ2/dyrZeaUtgXuBC1vRpjO3bcgOq97nf1vdrc5rW+y5hKSnu/jeye0+tktbXD/s3oT7zWx+iXW3h9/3tNPxMHAXcG6zJKL+Xtv5OC4gC554uCDdb+UW08X5BK65g9B7k0X63ZjbT5wL/CG2LqP71yILq74yPNvX+GzvY70JPbzax+36JtGIuzgN3hgJrFlOm9d6ENPAlqX4f7YlQmVzIfnJAAAAAElFTkSuQmCC";

const LOGO_MARK_SRC = "data:image/png;base64,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";

const SOJA_STAGES = ["VE","VC","V1","V2","V3","V4","V5","V6","R1","R2","R3","R4","R5","R6","R7","R8"];
const MILHO_STAGES = ["VE","V1","V2","V3","V4","V6","V8","V10","V12","V14","V16","V18","VT","R1","R2","R3","R4","R5","R6"];

const CULTURE_META = {
  Soja: { color: "#7BC142", bg: "#1C2E19", icon: Leaf, stages: SOJA_STAGES },
  Milho: { color: "#D6A93A", bg: "#332811", icon: Wheat, stages: MILHO_STAGES },
};

function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

function fieldAreaHa(f) {
  const manual = Number(f?.area);
  if (manual > 0) return manual;
  const mapped = Number(f?.fieldMap?.areaHa);
  return mapped > 0 ? mapped : 0;
}

function fmtDate(d) {
  if (!d) return "—";
  const dt = new Date(d + "T00:00:00");
  return dt.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function fmtDateTime(iso) {
  if (!iso) return "—";
  const dt = new Date(iso);
  return dt.toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

function daysSince(d) {
  if (!d) return null;
  const dt = new Date(d + "T00:00:00");
  const diff = Math.floor((Date.now() - dt.getTime()) / (1000 * 60 * 60 * 24));
  return diff;
}

function pad2(n) {
  return String(n).padStart(2, "0");
}

function toISODateLocal(d) {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

function addMonthsToISODate(dateStr, months) {
  const [y, m, d] = dateStr.split("-").map(Number);
  const date = new Date(y, m - 1 + months, d);
  return toISODateLocal(date);
}

function addMonthsToReferenceMonth(monthStr, months) {
  const [y, m] = monthStr.split("-").map(Number);
  const total = y * 12 + (m - 1) + months;
  const ny = Math.floor(total / 12);
  const nm = (total % 12) + 1;
  return `${ny}-${pad2(nm)}`;
}

const RECURRING_MONTHS_AHEAD = 12;

function startOfWeekMonday(d) {
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  const s = new Date(d);
  s.setDate(s.getDate() + diff);
  s.setHours(0, 0, 0, 0);
  return s;
}

function addDays(d, days) {
  const next = new Date(d);
  next.setDate(next.getDate() + days);
  return next;
}

function resizeImageToDataUrl(file, size = 160) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Não foi possível ler o arquivo."));
    reader.onload = (e) => {
      const img = new Image();
      img.onerror = () => reject(new Error("Arquivo de imagem inválido."));
      img.onload = () => {
        const scale = Math.max(size / img.width, size / img.height);
        const sw = size / scale, sh = size / scale;
        const sx = (img.width - sw) / 2, sy = (img.height - sh) / 2;
        const canvas = document.createElement("canvas");
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, sx, sy, sw, sh, 0, 0, size, size);
        resolve(canvas.toDataURL("image/jpeg", 0.85));
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  });
}

function resizeImageToBlob(file, maxDimension = 1600, quality = 0.8) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Não foi possível ler o arquivo."));
    reader.onload = (e) => {
      const img = new Image();
      img.onerror = () => reject(new Error("Arquivo de imagem inválido."));
      img.onload = () => {
        const scale = Math.min(1, maxDimension / Math.max(img.width, img.height));
        const w = Math.round(img.width * scale);
        const h = Math.round(img.height * scale);
        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, w, h);
        canvas.toBlob((blob) => {
          if (!blob) { reject(new Error("Falha ao processar a imagem.")); return; }
          resolve(blob);
        }, "image/jpeg", quality);
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  });
}

function Avatar({ name, url, size = 28 }) {
  const initials = (name || "?").trim().split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase()).join("");
  if (url) {
    return <img src={url} alt={name} style={{ width: size, height: size, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }} />;
  }
  return (
    <div style={{
      width: size, height: size, borderRadius: "50%", background: "#232B25", color: "#9BA298",
      display: "flex", alignItems: "center", justifyContent: "center", fontSize: size * 0.38,
      fontWeight: 700, fontFamily: "'Manrope', sans-serif", flexShrink: 0
    }}>
      {initials}
    </div>
  );
}


function StageProgress({ culture, stage }) {
  const meta = CULTURE_META[culture];
  if (!meta) return null;
  const idx = meta.stages.indexOf(stage);
  const pct = idx >= 0 ? (idx / (meta.stages.length - 1)) * 100 : 0;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 140 }}>
      <div style={{ flex: 1, height: 6, borderRadius: 3, background: "#26302A", position: "relative" }}>
        <div style={{
          position: "absolute", left: 0, top: 0, bottom: 0, borderRadius: 3,
          width: pct + "%", background: meta.color, transition: "width .3s"
        }} />
      </div>
      <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 9.5, fontWeight: 600, color: meta.color, minWidth: 26 }}>
        {stage || "—"}
      </span>
    </div>
  );
}

const VISIT_STATUS_META = {
  ok: { label: "Em dia", bg: "#16301A", color: "#7BC142" },
  late: { label: "Atrasado", bg: "#3A1414", color: "#E38B84" },
  none: { label: "Sem visitas", bg: "#232B25", color: "#9BA298" },
};

function VisitStatusBadge({ status }) {
  const meta = VISIT_STATUS_META[status] || VISIT_STATUS_META.none;
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", padding: "3px 9px",
      borderRadius: 20, background: meta.bg, color: meta.color, fontSize: 9.5, fontWeight: 600, whiteSpace: "nowrap"
    }}>
      {meta.label}
    </span>
  );
}

function CultureBadge({ culture }) {
  const meta = CULTURE_META[culture];
  if (!meta) return null;
  const Icon = meta.icon;
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 5, padding: "3px 9px",
      borderRadius: 20, background: meta.bg, color: meta.color, fontSize: 9.5, fontWeight: 600
    }}>
      <Icon size={12} /> {culture}
    </span>
  );
}

function AffectedCultureBadge({ value }) {
  if (!value) return <span style={{ color: "#6B7268", fontSize: 9.5 }}>—</span>;
  if (value === "Ambas") {
    return (
      <span style={{ display: "inline-flex", gap: 5 }}>
        <CultureBadge culture="Soja" />
        <CultureBadge culture="Milho" />
      </span>
    );
  }
  return <CultureBadge culture={value} />;
}

function Field({ label, children }) {
  return (
    <label style={{ display: "block", marginBottom: 14 }}>
      <span style={{ display: "block", fontSize: 9.5, fontWeight: 600, color: "#8B9188", marginBottom: 5, textTransform: "uppercase", letterSpacing: ".03em" }}>
        {label}
      </span>
      {children}
    </label>
  );
}

const inputStyle = {
  width: "100%", padding: "9px 11px", borderRadius: 8, border: "1px solid #2E362F",
  fontSize: 11, fontFamily: "inherit", background: "#10140F", color: "#EDEBE0", boxSizing: "border-box"
};

function Modal({ title, onClose, children, maxWidth = 460 }) {
  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.65)", display: "flex",
      alignItems: "center", justifyContent: "center", zIndex: 100, padding: 20
    }} onClick={onClose}>
      <div style={{
        background: "#161D19", borderRadius: 14, width: "100%", maxWidth,
        maxHeight: "88vh", overflowY: "auto", boxShadow: "0 20px 60px rgba(0,0,0,0.5)", border: "1px solid #232B25"
      }} onClick={(e) => e.stopPropagation()}>
        <div style={{
          display: "flex", justifyContent: "space-between", alignItems: "center",
          padding: "18px 22px", borderBottom: "1px solid #212922", position: "sticky", top: 0, background: "#161D19", borderRadius: "14px 14px 0 0"
        }}>
          <h3 style={{ margin: 0, fontFamily: "'Manrope', sans-serif", fontSize: 14.5, fontWeight: 700, color: "#F2F0E6" }}>{title}</h3>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "#6B7268", padding: 4 }}>
            <X size={20} />
          </button>
        </div>
        <div style={{ padding: 22 }}>{children}</div>
      </div>
    </div>
  );
}

function PrimaryBtn({ children, ...props }) {
  return (
    <button {...props} style={{
      background: "#3E7A3F", color: "#F5F2E8", border: "none", borderRadius: 8,
      padding: "10px 18px", fontSize: 11, fontWeight: 600, cursor: "pointer",
      display: "inline-flex", alignItems: "center", gap: 6, ...props.style
    }}>
      {children}
    </button>
  );
}

function GhostBtn({ children, ...props }) {
  return (
    <button {...props} style={{
      background: "transparent", color: "#D6D3C7", border: "1px solid #2E362F", borderRadius: 8,
      padding: "9px 16px", fontSize: 11, fontWeight: 500, cursor: "pointer",
      display: "inline-flex", alignItems: "center", gap: 6, ...props.style
    }}>
      {children}
    </button>
  );
}

const iconBtnStyle = { background: "none", border: "1px solid #232B25", borderRadius: 6, padding: 6, cursor: "pointer", color: "#8B9188" };

function LoginScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    const err = await signIn(email.trim(), password);
    setSubmitting(false);
    if (err) setError("E-mail ou senha inválidos.");
  }

  return (
    <div style={{
      minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center",
      background: "#0E1310", fontFamily: "'Inter', sans-serif"
    }}>
      <form onSubmit={handleSubmit} style={{ width: 320, background: "#161D19", border: "1px solid #232B25", borderRadius: 14, padding: 28 }}>
        <img src={LOGO_MARK_SRC} alt="Semear" style={{ height: 34, marginBottom: 18 }} />
        <h2 style={{ fontFamily: "'Manrope', sans-serif", fontSize: 16, fontWeight: 800, color: "#F2F0E6", margin: "0 0 4px" }}>Entrar</h2>
        <p style={{ color: "#9BA298", fontSize: 10.5, margin: "0 0 18px" }}>
          Acesse com o e-mail e senha cadastrados pelo administrador.
        </p>
        <Field label="E-mail">
          <input type="email" required style={inputStyle} value={email} onChange={(e) => setEmail(e.target.value)} placeholder="voce@exemplo.com" />
        </Field>
        <Field label="Senha">
          <input type="password" required style={inputStyle} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />
        </Field>
        {error && (
          <div style={{ background: "#3A1414", color: "#E38B84", padding: "9px 12px", borderRadius: 8, fontSize: 10.5, marginBottom: 14 }}>
            {error}
          </div>
        )}
        <PrimaryBtn type="submit" disabled={submitting} style={{ width: "100%", justifyContent: "center" }}>
          {submitting ? "Entrando…" : "Entrar"}
        </PrimaryBtn>
      </form>
    </div>
  );
}

export default function AgroTrackApp() {
  const [session, setSession] = useState(undefined); // undefined = checking, null = logged out
  const [profile, setProfile] = useState(undefined); // undefined = checking, null = no profile row
  const [loading, setLoading] = useState(true);
  const [portalData, setPortalData] = useState(null);
  const [portalError, setPortalError] = useState("");
  const [view, setView] = useState("dashboard");
  const [clients, setClients] = useState([]);
  const [properties, setProperties] = useState([]);
  const [fields, setFields] = useState([]);
  const [harvests, setHarvests] = useState([]);
  const [visits, setVisits] = useState([]);
  const [varieties, setVarieties] = useState([]);
  const [pesticides, setPesticides] = useState([]);
  const [fertilizers, setFertilizers] = useState([]);
  const [pests, setPests] = useState([]);
  const [diseases, setDiseases] = useState([]);
  const [weeds, setWeeds] = useState([]);
  const [team, setTeam] = useState([]);
  const [clientProfiles, setClientProfiles] = useState([]);
  const [teamAvatars, setTeamAvatars] = useState({});
  const [tasks, setTasks] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [activityLog, setActivityLog] = useState([]);
  const [finances, setFinances] = useState([]);
  const [bonuses, setBonuses] = useState([]);
  const [bills, setBills] = useState([]);
  const [categoryMemory, setCategoryMemory] = useState({});
  const [soilAnalyses, setSoilAnalyses] = useState([]);
  const [settings, setSettings] = useState({ commissionRatePerHaYear: 30, projectShareRate: 20 });
  const [modal, setModal] = useState(null);
  const [selectedClientId, setSelectedClientId] = useState(null);
  const [selectedPropertyId, setSelectedPropertyId] = useState(null);
  const [propertyBackTo, setPropertyBackTo] = useState("propriedades");
  const [selectedFieldId, setSelectedFieldId] = useState(null);
  const [selectedHarvestId, setSelectedHarvestId] = useState(null);
  const [search, setSearch] = useState("");
  const [propSearch, setPropSearch] = useState("");
  const [cultureFilter, setCultureFilter] = useState("Todas");
  const [teamError, setTeamError] = useState("");

  useEffect(() => {
    getSession().then(setSession);
    const sub = onAuthStateChange(setSession);
    return () => sub.unsubscribe();
  }, []);

  useEffect(() => {
    if (session === undefined) return;
    if (!session) { setProfile(null); return; }
    getMyProfile(session.user.id).then(setProfile);
  }, [session]);

  async function refreshTeam() {
    const all = await listProfiles();
    setTeam(all.filter((p) => p.role !== "cliente"));
    setClientProfiles(all.filter((p) => p.role === "cliente"));
  }

  useEffect(() => {
    if (!session || profile === undefined) return;

    if (profile?.role === "cliente") {
      (async () => {
        const r = await fetchClientPortalData();
        if (r.error) setPortalError(r.error); else setPortalData(r.data);
        setLoading(false);
      })();
      return;
    }

    (async () => {
      const [c, p, f, h, v, vr, pe, fe, ps, ds, ws, allProfiles, ta, tk, dc, al, fn, bn, st, bl, cm, sa] = await Promise.all([
        safeGet("clients"), safeGet("properties"), safeGet("fields"), safeGet("harvests"), safeGet("visits"),
        safeGet("varieties"), safeGet("pesticides"), safeGet("fertilizers"),
        safeGet("pests"), safeGet("diseases"), safeGet("weeds"), listProfiles(),
        safeGet("teamAvatars"), safeGet("tasks"), safeGet("documents"), safeGet("activityLog"),
        safeGet("finances"), safeGet("bonuses"), safeGet("settings"), safeGet("bills"), safeGet("categoryMemory"),
        safeGet("soilAnalyses")
      ]);
      setClients(c || []);
      setProperties(p || []);
      setFields(f || []);
      setHarvests(h || []);
      setVisits(v || []);
      setVarieties(vr || []);
      setPesticides(pe || []);
      setFertilizers(fe || []);
      setPests(ps || []);
      setDiseases(ds || []);
      setWeeds(ws || []);
      setTeam((allProfiles || []).filter((pr) => pr.role !== "cliente"));
      setClientProfiles((allProfiles || []).filter((pr) => pr.role === "cliente"));
      setTeamAvatars(ta || {});
      setTasks(tk || []);
      setDocuments(dc || []);
      setActivityLog(al || []);
      setFinances(fn || []);
      setBonuses(bn || []);
      setSettings({ commissionRatePerHaYear: 30, projectShareRate: 20, ...(st || {}) });
      setBills(bl || []);
      setCategoryMemory(cm || {});
      setSoilAnalyses(sa || []);
      setLoading(false);
    })();
  }, [session, profile]);

  async function persistClients(data) { setClients(data); await safeSet("clients", data); }
  async function persistProperties(data) { setProperties(data); await safeSet("properties", data); }
  async function persistFields(data) { setFields(data); await safeSet("fields", data); }
  async function persistHarvests(data) { setHarvests(data); await safeSet("harvests", data); }
  async function persistVisits(data) { setVisits(data); await safeSet("visits", data); }
  async function persistVarieties(data) { setVarieties(data); await safeSet("varieties", data); }
  async function persistPesticides(data) { setPesticides(data); await safeSet("pesticides", data); }
  async function persistFertilizers(data) { setFertilizers(data); await safeSet("fertilizers", data); }
  async function persistPests(data) { setPests(data); await safeSet("pests", data); }
  async function persistDiseases(data) { setDiseases(data); await safeSet("diseases", data); }
  async function persistWeeds(data) { setWeeds(data); await safeSet("weeds", data); }
  async function persistTeamAvatars(data) { setTeamAvatars(data); await safeSet("teamAvatars", data); }
  async function persistTasks(data) { setTasks(data); await safeSet("tasks", data); }
  async function persistDocuments(data) { setDocuments(data); await safeSet("documents", data); }
  async function persistActivityLog(data) { setActivityLog(data); await safeSet("activityLog", data); }

  function makeLogEntry(action, entityType, entityName, details) {
    return {
      id: uid(),
      at: new Date().toISOString(),
      userId: session?.user?.id || null,
      userName: profile?.name || session?.user?.email || "Desconhecido",
      action, entityType, entityName: entityName || "(sem nome)", details: details || null,
    };
  }
  function logActivity(entries) {
    const list = Array.isArray(entries) ? entries : [entries];
    persistActivityLog([...activityLog, ...list]);
  }

  async function persistFinances(data) { setFinances(data); await safeSet("finances", data); }
  async function persistBonuses(data) { setBonuses(data); await safeSet("bonuses", data); }
  async function persistSettings(data) { setSettings(data); await safeSet("settings", data); }
  async function persistBills(data) { setBills(data); await safeSet("bills", data); }
  async function persistCategoryMemory(data) { setCategoryMemory(data); await safeSet("categoryMemory", data); }

  function generateRecurringEntries(baseForm) {
    const entries = [];
    for (let i = 0; i < RECURRING_MONTHS_AHEAD; i++) {
      entries.push({
        ...baseForm,
        id: uid(),
        date: baseForm.date ? addMonthsToISODate(baseForm.date, i) : baseForm.date,
        referenceMonth: baseForm.referenceMonth ? addMonthsToReferenceMonth(baseForm.referenceMonth, i) : baseForm.referenceMonth,
        status: i === 0 ? baseForm.status : "pendente",
        recurring: true,
      });
    }
    return entries;
  }

  function saveFinance(form) {
    const client = clients.find((c) => c.id === form.clientId);
    if (form.id) {
      logActivity(makeLogEntry("update", "finance", client?.name, `R$ ${Number(form.amount).toLocaleString("pt-BR")} · ${form.referenceMonth}`));
      persistFinances(finances.map((fEntry) => (fEntry.id === form.id ? form : fEntry)));
    } else if (form.recurring) {
      const entries = generateRecurringEntries(form);
      logActivity(makeLogEntry("create", "finance", client?.name, `Recorrente · ${entries.length} meses lançados`));
      persistFinances([...finances, ...entries]);
    } else {
      logActivity(makeLogEntry("create", "finance", client?.name, `R$ ${Number(form.amount).toLocaleString("pt-BR")} · ${form.referenceMonth}`));
      persistFinances([...finances, { ...form, id: uid() }]);
    }
    setModal(null);
  }
  function deleteFinance(id) {
    const entry = finances.find((f) => f.id === id);
    const client = clients.find((c) => c.id === entry?.clientId);
    logActivity(makeLogEntry("delete", "finance", client?.name));
    persistFinances(finances.filter((f) => f.id !== id));
  }
  function markFinancePaid(entry, transaction) {
    const client = clients.find((c) => c.id === entry.clientId);
    logActivity(makeLogEntry("update", "finance", client?.name, `Conciliado via extrato · ${fmtCurrency(entry.amount)} em ${fmtDate(transaction.date)}`));
    persistFinances(finances.map((f) => (f.id === entry.id ? { ...f, status: "pago", date: transaction.date, reconciledBank: true, reconciledAt: new Date().toISOString() } : f)));
  }
  function markBillPaid(entry, transaction) {
    logActivity(makeLogEntry("update", "bill", entry.description, `Conciliado via extrato · ${fmtCurrency(entry.amount)} em ${fmtDate(transaction.date)}`));
    persistBills(bills.map((b) => (b.id === entry.id ? { ...b, status: "pago", date: transaction.date, reconciledBank: true, reconciledAt: new Date().toISOString() } : b)));
  }

  function saveBill(form) {
    if (form.category && form.description) {
      const key = normalizeDescription(form.description);
      if (key && categoryMemory[key] !== form.category) {
        persistCategoryMemory({ ...categoryMemory, [key]: form.category });
      }
    }
    if (form.id) {
      logActivity(makeLogEntry("update", "bill", form.description, `R$ ${Number(form.amount).toLocaleString("pt-BR")} · ${form.referenceMonth}`));
      persistBills(bills.map((b) => (b.id === form.id ? form : b)));
    } else if (form.recurring) {
      const entries = generateRecurringEntries(form);
      logActivity(makeLogEntry("create", "bill", form.description, `Recorrente · ${entries.length} meses lançados`));
      persistBills([...bills, ...entries]);
    } else {
      logActivity(makeLogEntry("create", "bill", form.description, `R$ ${Number(form.amount).toLocaleString("pt-BR")} · ${form.referenceMonth}`));
      persistBills([...bills, { ...form, id: uid() }]);
    }
    setModal(null);
  }
  function deleteBill(id) {
    const bill = bills.find((b) => b.id === id);
    logActivity(makeLogEntry("delete", "bill", bill?.description));
    persistBills(bills.filter((b) => b.id !== id));
  }

  function saveBonus(form) {
    const gestor = team.find((t) => t.id === form.gestorId);
    logActivity(makeLogEntry(form.id ? "update" : "create", "bonus", gestor?.name, `${form.description} · R$ ${Number(form.amount).toLocaleString("pt-BR")}`));
    if (form.id) {
      persistBonuses(bonuses.map((b) => (b.id === form.id ? form : b)));
    } else {
      persistBonuses([...bonuses, { ...form, id: uid() }]);
    }
    setModal(null);
  }
  function deleteBonus(id) {
    const bonus = bonuses.find((b) => b.id === id);
    const gestor = team.find((t) => t.id === bonus?.gestorId);
    logActivity(makeLogEntry("delete", "bonus", gestor?.name, bonus?.description));
    persistBonuses(bonuses.filter((b) => b.id !== id));
  }

  function updateCommissionRate(rate) {
    logActivity(makeLogEntry("update", "settings", "Pró-labore por hectare", `R$ ${rate}/ha/ano`));
    persistSettings({ ...settings, commissionRatePerHaYear: rate });
  }
  function updateProjectShareRate(rate) {
    logActivity(makeLogEntry("update", "settings", "Pró-labore de projetos", `${rate}% dos honorários de projeto`));
    persistSettings({ ...settings, projectShareRate: rate });
  }

  async function promoteToAdmin(id) {
    const r = await setTeamRole({ id, role: "administrador" });
    if (r.error) { alert(r.error); return; }
    const member = team.find((t) => t.id === id);
    logActivity(makeLogEntry("update", "team", member?.name, "Promovido a Administrador"));
    await refreshTeam();
  }
  async function demoteToTecnico(id) {
    const r = await setTeamRole({ id, role: "colaborador" });
    if (r.error) { alert(r.error); return; }
    const member = team.find((t) => t.id === id);
    logActivity(makeLogEntry("update", "team", member?.name, "Rebaixado a Técnico"));
    await refreshTeam();
  }

  function saveClient(form) {
    logActivity(makeLogEntry(form.id ? "update" : "create", "client", form.name));
    if (form.id) {
      persistClients(clients.map((c) => (c.id === form.id ? form : c)));
    } else {
      persistClients([...clients, { ...form, id: uid() }]);
    }
    setModal(null);
  }
  function deleteClient(id) {
    const client = clients.find((c) => c.id === id);
    const propIds = properties.filter((p) => p.clientId === id).map((p) => p.id);
    const fieldIds = fields.filter((f) => propIds.includes(f.propertyId)).map((f) => f.id);
    const harvestIds = harvests.filter((h) => fieldIds.includes(h.fieldId)).map((h) => h.id);
    logActivity(makeLogEntry("delete", "client", client?.name, propIds.length || fieldIds.length ? `${propIds.length} propriedade(s) e ${fieldIds.length} talhão(ões) removidos junto` : null));
    persistVisits(visits.filter((v) => !harvestIds.includes(v.harvestId)));
    persistHarvests(harvests.filter((h) => !fieldIds.includes(h.fieldId)));
    persistFields(fields.filter((f) => !propIds.includes(f.propertyId)));
    persistProperties(properties.filter((p) => p.clientId !== id));
    persistClients(clients.filter((c) => c.id !== id));
    if (selectedClientId === id) { setSelectedClientId(null); setSelectedPropertyId(null); setSelectedFieldId(null); setSelectedHarvestId(null); }
  }

  function saveProperty(form) {
    logActivity(makeLogEntry(form.id ? "update" : "create", "property", form.name));
    if (form.id) {
      persistProperties(properties.map((p) => (p.id === form.id ? form : p)));
    } else {
      persistProperties([...properties, { ...form, id: uid() }]);
    }
    setModal(null);
  }
  function deleteProperty(id) {
    const property = properties.find((p) => p.id === id);
    const fieldIds = fields.filter((f) => f.propertyId === id).map((f) => f.id);
    const harvestIds = harvests.filter((h) => fieldIds.includes(h.fieldId)).map((h) => h.id);
    logActivity(makeLogEntry("delete", "property", property?.name, fieldIds.length ? `${fieldIds.length} talhão(ões) removido(s) junto` : null));
    persistVisits(visits.filter((v) => !harvestIds.includes(v.harvestId)));
    persistHarvests(harvests.filter((h) => !fieldIds.includes(h.fieldId)));
    persistFields(fields.filter((f) => f.propertyId !== id));
    persistProperties(properties.filter((p) => p.id !== id));
    if (selectedPropertyId === id) { setSelectedPropertyId(null); setSelectedFieldId(null); setSelectedHarvestId(null); }
  }

  function saveField(form) {
    logActivity(makeLogEntry(form.id ? "update" : "create", "field", form.name));
    if (form.id) {
      persistFields(fields.map((f) => (f.id === form.id ? form : f)));
    } else {
      persistFields([...fields, { ...form, id: uid() }]);
    }
    setModal(null);
  }
  function deleteField(id) {
    const field = fields.find((f) => f.id === id);
    const harvestIds = harvests.filter((h) => h.fieldId === id).map((h) => h.id);
    logActivity(makeLogEntry("delete", "field", field?.name));
    persistVisits(visits.filter((v) => !harvestIds.includes(v.harvestId)));
    persistHarvests(harvests.filter((h) => h.fieldId !== id));
    persistFields(fields.filter((f) => f.id !== id));
    if (selectedFieldId === id) { setSelectedFieldId(null); setSelectedHarvestId(null); }
  }

  function saveHarvest(form) {
    logActivity(makeLogEntry(form.id ? "update" : "create", "harvest", form.name));
    if (form.id) {
      persistHarvests(harvests.map((h) => (h.id === form.id ? form : h)));
    } else {
      persistHarvests([...harvests, { ...form, id: uid() }]);
    }
    setModal(null);
  }
  function deleteHarvest(id) {
    const harvest = harvests.find((h) => h.id === id);
    logActivity(makeLogEntry("delete", "harvest", harvest?.name));
    persistVisits(visits.filter((v) => v.harvestId !== id));
    persistHarvests(harvests.filter((h) => h.id !== id));
    if (selectedHarvestId === id) setSelectedHarvestId(null);
  }

  function saveVisit(form) {
    const exists = visits.some((v) => v.id === form.id);
    logActivity(makeLogEntry(exists ? "update" : "create", "visit", fmtDate(form.date)));
    if (exists) {
      persistVisits(visits.map((v) => (v.id === form.id ? form : v)));
    } else {
      persistVisits([...visits, form]);
    }
    setModal(null);
  }
  function deleteVisit(id) {
    const visit = visits.find((v) => v.id === id);
    logActivity(makeLogEntry("delete", "visit", visit ? fmtDate(visit.date) : null));
    persistVisits(visits.filter((v) => v.id !== id));
  }
  async function uploadVisitPhoto(visitId, file) {
    let blob;
    try {
      blob = await resizeImageToBlob(file);
    } catch (e) {
      return { error: e.message };
    }
    const safeName = file.name
      .normalize("NFD").replace(/[̀-ͯ]/g, "")
      .replace(/[^a-zA-Z0-9.\-_]/g, "_")
      .replace(/\.\w+$/, ".jpg");
    const path = `visits/${visitId}/${uid()}-${safeName}`;
    const { error: uploadError } = await supabase.storage.from("documents").upload(path, blob, { contentType: "image/jpeg" });
    if (uploadError) return { error: uploadError.message };
    const { data: pub } = supabase.storage.from("documents").getPublicUrl(path);
    const photo = { id: uid(), path, url: pub.publicUrl, uploadedAt: new Date().toISOString() };
    if (visits.some((v) => v.id === visitId)) {
      persistVisits(visits.map((v) => (v.id === visitId ? { ...v, photos: [...(v.photos || []), photo] } : v)));
    }
    return { ok: true, photo };
  }
  async function deleteVisitPhoto(visitId, photo) {
    await supabase.storage.from("documents").remove([photo.path]);
    if (visits.some((v) => v.id === visitId)) {
      persistVisits(visits.map((v) => (v.id === visitId ? { ...v, photos: (v.photos || []).filter((p) => p.id !== photo.id) } : v)));
    }
  }

  async function persistSoilAnalyses(data) { setSoilAnalyses(data); await safeSet("soilAnalyses", data); }
  function saveSoilAnalysis(form) {
    const field = fields.find((f) => f.id === form.fieldId);
    const exists = soilAnalyses.some((s) => s.id === form.id);
    logActivity(makeLogEntry(exists ? "update" : "create", "soilAnalysis", field?.name, form.label || fmtDate(form.date)));
    if (exists) {
      persistSoilAnalyses(soilAnalyses.map((s) => (s.id === form.id ? form : s)));
    } else {
      persistSoilAnalyses([...soilAnalyses, form]);
    }
    setModal(null);
  }
  function deleteSoilAnalysis(id) {
    const analysis = soilAnalyses.find((s) => s.id === id);
    const field = fields.find((f) => f.id === analysis?.fieldId);
    logActivity(makeLogEntry("delete", "soilAnalysis", field?.name));
    persistSoilAnalyses(soilAnalyses.filter((s) => s.id !== id));
  }

  function saveVariety(form) {
    if (form.id) {
      persistVarieties(varieties.map((v) => (v.id === form.id ? form : v)));
    } else {
      persistVarieties([...varieties, { ...form, id: uid() }]);
    }
    setModal(null);
  }
  function deleteVariety(id) {
    persistVarieties(varieties.filter((v) => v.id !== id));
  }

  function savePesticide(form) {
    if (form.id) {
      persistPesticides(pesticides.map((p) => (p.id === form.id ? form : p)));
    } else {
      persistPesticides([...pesticides, { ...form, id: uid() }]);
    }
    setModal(null);
  }
  function deletePesticide(id) {
    persistPesticides(pesticides.filter((p) => p.id !== id));
  }

  function saveFertilizer(form) {
    if (form.id) {
      persistFertilizers(fertilizers.map((f) => (f.id === form.id ? form : f)));
    } else {
      persistFertilizers([...fertilizers, { ...form, id: uid() }]);
    }
    setModal(null);
  }
  function deleteFertilizer(id) {
    persistFertilizers(fertilizers.filter((f) => f.id !== id));
  }

  function savePest(form) {
    if (form.id) {
      persistPests(pests.map((p) => (p.id === form.id ? form : p)));
    } else {
      persistPests([...pests, { ...form, id: uid() }]);
    }
    setModal(null);
  }
  function deletePest(id) {
    persistPests(pests.filter((p) => p.id !== id));
  }

  function saveDisease(form) {
    if (form.id) {
      persistDiseases(diseases.map((d) => (d.id === form.id ? form : d)));
    } else {
      persistDiseases([...diseases, { ...form, id: uid() }]);
    }
    setModal(null);
  }
  function deleteDisease(id) {
    persistDiseases(diseases.filter((d) => d.id !== id));
  }

  function saveWeed(form) {
    if (form.id) {
      persistWeeds(weeds.map((w) => (w.id === form.id ? form : w)));
    } else {
      persistWeeds([...weeds, { ...form, id: uid() }]);
    }
    setModal(null);
  }
  function deleteWeed(id) {
    persistWeeds(weeds.filter((w) => w.id !== id));
  }

  async function saveTeamMember(form) {
    if (form.id) {
      const r = await updateColaborador({ id: form.id, name: form.name, phone: form.phone, title: form.title });
      if (r.error) { setTeamError(r.error); return; }
      if (form.avatarDataUrl !== undefined) await saveTeamAvatar(form.id, form.avatarDataUrl);
      logActivity(makeLogEntry("update", "team", form.name));
      await refreshTeam();
      setModal(null);
    } else {
      const r = await createColaborador({ name: form.name, email: form.email, phone: form.phone, title: form.title, password: form.password });
      if (r.error) { setTeamError(r.error); return; }
      if (form.avatarDataUrl && r.data?.id) await saveTeamAvatar(r.data.id, form.avatarDataUrl);
      logActivity(makeLogEntry("create", "team", form.name));
      await refreshTeam();
      setModal({ type: "teamCreated", data: { name: form.name, email: form.email, password: form.password } });
    }
  }
  async function deleteTeamMember(id) {
    const member = team.find((t) => t.id === id);
    const r = await deleteColaborador(id);
    if (r.error) { alert(r.error); return; }
    if (teamAvatars[id]) await saveTeamAvatar(id, null);
    logActivity(makeLogEntry("delete", "team", member?.name));
    await refreshTeam();
  }
  async function saveTeamAvatar(id, dataUrl) {
    const next = { ...teamAvatars };
    if (dataUrl) next[id] = dataUrl; else delete next[id];
    await persistTeamAvatars(next);
  }

  function saveTask(form) {
    logActivity(makeLogEntry(form.id ? "update" : "create", "task", form.title));
    if (form.id) {
      persistTasks(tasks.map((t) => (t.id === form.id ? form : t)));
    } else {
      persistTasks([...tasks, { ...form, id: uid(), done: false }]);
    }
    setModal(null);
  }
  function deleteTask(id) {
    const task = tasks.find((t) => t.id === id);
    logActivity(makeLogEntry("delete", "task", task?.title));
    persistTasks(tasks.filter((t) => t.id !== id));
  }
  function toggleTaskDone(id) {
    persistTasks(tasks.map((t) => (t.id === id ? { ...t, done: !t.done } : t)));
  }

  async function uploadDocument({ clientId, file, title }) {
    const safeName = file.name
      .normalize("NFD").replace(/[̀-ͯ]/g, "")
      .replace(/[^a-zA-Z0-9.\-_]/g, "_");
    const path = `${clientId}/${uid()}-${safeName}`;
    const { error: uploadError } = await supabase.storage.from("documents").upload(path, file);
    if (uploadError) return { error: uploadError.message };
    const { data: pub } = supabase.storage.from("documents").getPublicUrl(path);
    const doc = {
      id: uid(), clientId, title: title?.trim() || file.name, path,
      url: pub.publicUrl, sizeBytes: file.size, uploadedAt: new Date().toISOString(),
    };
    await persistDocuments([...documents, doc]);
    logActivity(makeLogEntry("create", "document", doc.title));
    return { ok: true };
  }
  async function deleteDocument(doc) {
    await supabase.storage.from("documents").remove([doc.path]);
    logActivity(makeLogEntry("delete", "document", doc.title));
    await persistDocuments(documents.filter((d) => d.id !== doc.id));
  }

  async function saveClientAccess(form) {
    if (form.id) {
      const r = await updateClientAccess({ id: form.id, name: form.name, phone: form.phone });
      if (r.error) { setTeamError(r.error); return; }
      logActivity(makeLogEntry("update", "clientAccess", form.name));
      await refreshTeam();
      setModal(null);
    } else {
      const r = await createClientAccess({ name: form.name, email: form.email, phone: form.phone, password: form.password, clientId: form.clientId });
      if (r.error) { setTeamError(r.error); return; }
      logActivity(makeLogEntry("create", "clientAccess", form.name));
      await refreshTeam();
      setModal({ type: "teamCreated", data: { name: form.name, email: form.email, password: form.password } });
    }
  }
  async function removeClientAccess(id) {
    const account = clientProfiles.find((p) => p.id === id);
    const r = await deleteClientAccess(id);
    if (r.error) { alert(r.error); return; }
    logActivity(makeLogEntry("delete", "clientAccess", account?.name));
    await refreshTeam();
  }

  const propertiesWithMeta = useMemo(() => {
    return properties.map((p) => {
      const client = clients.find((c) => c.id === p.clientId);
      const propFields = fields.filter((f) => f.propertyId === p.id);
      const area = propFields.reduce((s, f) => s + fieldAreaHa(f), 0);
      return { ...p, clientName: client ? client.name : "—", fieldCount: propFields.length, areaTotal: area };
    });
  }, [properties, clients, fields]);

  const clientsWithMeta = useMemo(() => {
    const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10);
    return clients.map((c) => {
      const gestor = team.find((t) => t.id === c.gestorId) || null;
      const clientPropertyIds = properties.filter((p) => p.clientId === c.id).map((p) => p.id);
      const clientFieldIds = fields.filter((f) => clientPropertyIds.includes(f.propertyId)).map((f) => f.id);
      const clientHarvestIds = harvests.filter((h) => clientFieldIds.includes(h.fieldId)).map((h) => h.id);
      const clientVisits = visits.filter((v) => clientHarvestIds.includes(v.harvestId));
      const lastVisitDate = clientVisits.reduce((latest, v) => (!latest || v.date > latest ? v.date : latest), null);
      const visitStatus = !lastVisitDate ? "none" : lastVisitDate >= weekAgo ? "ok" : "late";
      return { ...c, gestorName: gestor?.name || null, gestorAvatar: gestor ? teamAvatars[gestor.id] || null : null, lastVisitDate, visitStatus };
    });
  }, [clients, team, teamAvatars, properties, fields, harvests, visits]);

  const harvestsWithMeta = useMemo(() => {
    return harvests.map((h) => {
      const field = fields.find((f) => f.id === h.fieldId);
      const property = field ? properties.find((p) => p.id === field.propertyId) : null;
      const client = property ? clients.find((c) => c.id === property.clientId) : null;
      const harvestVisits = visits.filter((v) => v.harvestId === h.id).sort((a, b) => b.date.localeCompare(a.date));
      const variety = varieties.find((vv) => vv.name === h.variety && vv.culture === h.culture);
      const estimatedHarvestDate = h.plantingDate && variety?.cycle
        ? new Date(new Date(h.plantingDate + "T00:00:00").getTime() + Number(variety.cycle) * 86400000).toISOString().slice(0, 10)
        : null;
      return {
        ...h,
        fieldName: field ? field.name : "—",
        fieldArea: field ? fieldAreaHa(field) : 0,
        propertyName: property ? property.name : "—",
        clientName: client ? client.name : "—",
        status: h.harvestDate ? "Colhida" : "Em andamento",
        estimatedHarvestDate,
        lastVisit: harvestVisits[0] || null,
        visitCount: harvestVisits.length,
      };
    });
  }, [harvests, fields, properties, clients, visits, varieties]);

  const fieldsWithMeta = useMemo(() => {
    return fields.map((f) => {
      const property = properties.find((p) => p.id === f.propertyId);
      const client = property ? clients.find((c) => c.id === property.clientId) : null;
      const fieldHarvests = harvestsWithMeta
        .filter((h) => h.fieldId === f.id)
        .sort((a, b) => (b.plantingDate || "").localeCompare(a.plantingDate || ""));
      const activeHarvest = fieldHarvests.find((h) => h.status === "Em andamento") || null;
      return {
        ...f,
        propertyName: property ? property.name : "—",
        clientName: client ? client.name : "—",
        harvests: fieldHarvests,
        harvestCount: fieldHarvests.length,
        activeHarvest,
      };
    });
  }, [fields, properties, clients, harvestsWithMeta]);

  const totals = useMemo(() => {
    const activeHarvests = harvestsWithMeta.filter((h) => h.status === "Em andamento");
    const areaSoja = activeHarvests.filter((h) => h.culture === "Soja").reduce((s, h) => s + h.fieldArea, 0);
    const areaMilho = activeHarvests.filter((h) => h.culture === "Milho").reduce((s, h) => s + h.fieldArea, 0);
    const areaPlantada = areaSoja + areaMilho;
    const areaFisicaTotal = fields.reduce((s, f) => s + fieldAreaHa(f), 0);
    const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10);
    const visitsWeek = visits.filter((v) => v.date >= weekAgo).length;
    return { areaSoja, areaMilho, areaPlantada, areaTotal: areaFisicaTotal, visitsWeek, activeHarvestCount: activeHarvests.length };
  }, [harvestsWithMeta, visits, fields]);

  const recentVisits = useMemo(() => {
    return [...visits].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 6).map((v) => {
      const harvest = harvestsWithMeta.find((h) => h.id === v.harvestId);
      return {
        ...v,
        fieldName: harvest ? harvest.fieldName : "—",
        culture: harvest ? harvest.culture : null,
        clientName: harvest ? harvest.clientName : "—",
        propertyName: harvest ? harvest.propertyName : "—",
      };
    });
  }, [visits, harvestsWithMeta]);

  const filteredClients = clientsWithMeta.filter((c) => c.name.toLowerCase().includes(search.toLowerCase()));
  const filteredProperties = propertiesWithMeta.filter((p) => (p.name + p.clientName).toLowerCase().includes(propSearch.toLowerCase()));
  const filteredFields = fieldsWithMeta.filter((f) => cultureFilter === "Todas" || f.activeHarvest?.culture === cultureFilter);

  const isFinance = profile?.role === "master" || profile?.role === "administrador";
  const isMaster = profile?.role === "master";

  const currentMonth = useMemo(() => new Date().toISOString().slice(0, 7), []);
  const monthFinanceSummary = useMemo(() => {
    if (!isFinance) return null;
    return computeMonthFinanceSummary({ finances, bonuses, bills, settings, clients, team, properties, fields, month: currentMonth });
  }, [isFinance, finances, bonuses, bills, settings, clients, team, properties, fields, currentMonth]);

  const NAV = [
    { id: "dashboard", label: "Painel", icon: LayoutDashboard },
    { id: "clientes", label: "Clientes", icon: Users },
    { id: "propriedades", label: "Propriedades", icon: Home },
    { id: "talhoes", label: "Talhões", icon: Sprout },
    { id: "agenda", label: "Agenda", icon: Calendar },
    { id: "visitas", label: "Visitas", icon: ClipboardList },
    { id: "solo", label: "Análise de Solo", icon: FlaskConical },
    { id: "equipe", label: "Equipe", icon: UserCog },
    { id: "atividade", label: "Atividade", icon: History },
    ...(isFinance ? [{ id: "financeiro", label: "Financeiro", icon: Wallet }] : []),
    { id: "configuracoes", label: "Configurações", icon: Settings },
  ];

  function goToView(id) {
    setView(id);
    setSelectedClientId(null);
    setSelectedPropertyId(null);
    setSelectedFieldId(null);
    setSelectedHarvestId(null);
  }

  function openPropertyFromClient(propId) {
    setPropertyBackTo("clientDetail");
    setSelectedPropertyId(propId);
  }
  function openPropertyFromList(propId) {
    setPropertyBackTo("propriedades");
    setSelectedPropertyId(propId);
  }
  function closePropertyDetail() {
    setSelectedPropertyId(null);
    setSelectedFieldId(null);
    setSelectedHarvestId(null);
    if (propertyBackTo === "propriedades") setView("propriedades");
  }
  function openField(fieldId) {
    setSelectedFieldId(fieldId);
  }
  function openClientFromDashboard(clientId) {
    setView("clientes");
    setSelectedClientId(clientId);
  }
  function closeFieldDetail() {
    setSelectedFieldId(null);
    setSelectedHarvestId(null);
  }
  function closeHarvestDetail() {
    setSelectedHarvestId(null);
  }

  if (session === undefined) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 400, fontFamily: "Inter, sans-serif", color: "#9BA298" }}>
        Verificando sessão…
      </div>
    );
  }

  if (!session) {
    return <LoginScreen />;
  }

  if (loading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 400, fontFamily: "Inter, sans-serif", color: "#9BA298" }}>
        Carregando dados…
      </div>
    );
  }

  if (profile?.role === "cliente") {
    return <ClientPortalApp data={portalData} error={portalError} onSignOut={signOut} />;
  }

  return (
    <div style={{
      fontFamily: "'Inter', -apple-system, sans-serif", display: "flex", minHeight: 640,
      background: "#0E1310", borderRadius: 14, overflow: "hidden", border: "1px solid #232B25"
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Manrope:wght@600;700;800&family=Inter:wght@400;500;600;700&family=IBM+Plex+Mono:wght@500;600&display=swap');
        * { box-sizing: border-box; }
        button:hover { opacity: 0.92; }
        table { border-collapse: collapse; width: 100%; }
        th { text-align: left; font-size: 10px; text-transform: uppercase; letter-spacing: .04em; color: #6B7268; padding: 10px 12px; border-bottom: 1px solid #232B25; }
        td { padding: 12px; border-bottom: 1px solid #212922; font-size: 10.5px; color: #D6D3C7; vertical-align: middle; }
        tr:last-child td { border-bottom: none; }
        select option { background: #161D19; color: #EDEBE0; }
        .at-sidebar { width: 60px; transition: width .18s ease; overflow: hidden; }
        .at-sidebar:hover { width: 210px; }
        .at-sidebar .nav-label { display: inline-block; max-width: 0; overflow: hidden; opacity: 0; white-space: nowrap; transition: max-width .18s ease, opacity .12s ease; }
        .at-sidebar:hover .nav-label { max-width: 160px; opacity: 1; }
        .at-sidebar .sidebar-footer-text { white-space: nowrap; opacity: 0; transition: opacity .12s ease; }
        .at-sidebar:hover .sidebar-footer-text { opacity: 1; }
        .at-sidebar .logo-full { display: none; width: 100%; height: auto; }
        .at-sidebar .logo-mark { display: block; height: 24px; width: 24px; object-fit: contain; }
        .at-sidebar:hover .logo-full { display: block; }
        .at-sidebar:hover .logo-mark { display: none; }
        .leaflet-container { background: #0E1310; font-family: 'IBM Plex Mono', monospace; }
        .leaflet-control-layers { background: #161D19 !important; border: 1px solid #232B25 !important; color: #D6D3C7; }
        .leaflet-control-layers-toggle { filter: invert(1); }
        .leaflet-control-layers label { color: #D6D3C7; font-size: 11px; }
        .leaflet-control-zoom a { background: #161D19 !important; color: #D6D3C7 !important; border-color: #232B25 !important; }
        .leaflet-control-attribution { background: rgba(14,19,16,0.75) !important; color: #6B7268 !important; }
        .leaflet-control-attribution a { color: #9BA298 !important; }
        .field-map-label { background: rgba(14,19,16,0.85) !important; border: none !important; box-shadow: none !important; color: #F2F0E6 !important; font-size: 10px; font-family: 'IBM Plex Mono', monospace; padding: 2px 6px !important; }
        .field-map-label::before { display: none !important; }
      `}</style>

      {/* Sidebar */}
      <div className="at-sidebar" style={{ background: "#0A1C0C", color: "#DAD7C9", padding: "22px 14px", display: "flex", flexDirection: "column", flexShrink: 0 }}>
        <div style={{ padding: "6px 4px", margin: "0 0 22px" }}>
          <img src="/favicon.png" alt="Semear" className="logo-mark" />
          <img src={LOGO_SRC} alt="Semear Consultoria Agropecuária" className="logo-full" />
        </div>
        {NAV.map((n) => {
          const Icon = n.icon;
          const active = view === n.id;
          return (
            <button key={n.id} onClick={() => goToView(n.id)} style={{
              display: "flex", alignItems: "center", gap: 10, width: "100%", padding: "10px 12px",
              marginBottom: 4, borderRadius: 8, border: "none", cursor: "pointer", textAlign: "left",
              background: active ? "#1E4A20" : "transparent", color: active ? "#F5F2E8" : "#9BA298",
              fontSize: 11, fontWeight: active ? 600 : 500, flexShrink: 0
            }}>
              <Icon size={17} style={{ flexShrink: 0 }} /> <span className="nav-label">{n.label}</span>
            </button>
          );
        })}
        <div className="sidebar-footer-text" style={{ marginTop: "auto", padding: "14px 8px 0", fontSize: 9.5, color: "#6F776C", borderTop: "1px solid #1E4A20" }}>
          <div style={{ marginBottom: 6, color: "#9BA298" }}>{profile?.name || session.user.email}</div>
          <button onClick={() => signOut()} style={{ background: "none", border: "none", color: "#E3B455", cursor: "pointer", fontSize: 9.5, padding: 0 }}>
            Sair
          </button>
        </div>
      </div>

      {/* Main content */}
      <div style={{ flex: 1, padding: "26px 32px", overflowY: "auto" }}>
        {view === "dashboard" && (
          <Dashboard totals={totals} recentVisits={recentVisits} clients={clientsWithMeta} properties={properties} fields={fieldsWithMeta} onOpenField={openField} onOpenClient={openClientFromDashboard} isFinance={isFinance} monthFinanceSummary={monthFinanceSummary} />
        )}

        {view === "clientes" && !selectedClientId && (
          <ClientesView
            clients={filteredClients} properties={properties} search={search} setSearch={setSearch}
            onAdd={() => setModal({ type: "client", data: null })}
            onEdit={(c) => setModal({ type: "client", data: c })}
            onDelete={deleteClient}
            onOpen={(id) => setSelectedClientId(id)}
          />
        )}

        {view === "clientes" && selectedClientId && !selectedPropertyId && (
          <ClientDetail
            client={clientsWithMeta.find((c) => c.id === selectedClientId)}
            properties={propertiesWithMeta.filter((p) => p.clientId === selectedClientId)}
            onBack={() => setSelectedClientId(null)}
            onAddProperty={() => setModal({ type: "property", data: { clientId: selectedClientId } })}
            onEditProperty={(p) => setModal({ type: "property", data: p })}
            onDeleteProperty={deleteProperty}
            onOpenProperty={openPropertyFromClient}
            clientAccess={clientProfiles.find((p) => p.client_id === selectedClientId)}
            isMaster={profile?.role === "master"}
            onCreateAccess={() => { setTeamError(""); setModal({ type: "clientAccess", data: { clientId: selectedClientId } }); }}
            onDeleteAccess={removeClientAccess}
            documents={documents.filter((d) => d.clientId === selectedClientId)}
            onUploadDocument={uploadDocument}
            onDeleteDocument={deleteDocument}
          />
        )}

        {selectedHarvestId && (
          <HarvestDetail
            harvest={harvestsWithMeta.find((h) => h.id === selectedHarvestId)}
            visits={visits.filter((v) => v.harvestId === selectedHarvestId)}
            onBack={closeHarvestDetail}
            onEdit={() => setModal({ type: "harvest", data: harvests.find((h) => h.id === selectedHarvestId) })}
            onAddVisit={() => setModal({ type: "visit", data: { harvestId: selectedHarvestId } })}
            onEditVisit={(v) => setModal({ type: "visit", data: v })}
            onDeleteVisit={deleteVisit}
          />
        )}

        {selectedFieldId && !selectedHarvestId && (
          <FieldDetail
            field={fieldsWithMeta.find((f) => f.id === selectedFieldId)}
            soilAnalyses={soilAnalyses.filter((s) => s.fieldId === selectedFieldId)}
            onBack={closeFieldDetail}
            onAddHarvest={() => setModal({ type: "harvest", data: { fieldId: selectedFieldId } })}
            onEditHarvest={(h) => setModal({ type: "harvest", data: h })}
            onDeleteHarvest={deleteHarvest}
            onOpenHarvest={(id) => setSelectedHarvestId(id)}
            onAddSoilAnalysis={() => setModal({ type: "soilAnalysis", data: { field: fieldsWithMeta.find((f) => f.id === selectedFieldId), analysis: null } })}
            onEditSoilAnalysis={(sa) => setModal({ type: "soilAnalysis", data: { field: fieldsWithMeta.find((f) => f.id === selectedFieldId), analysis: sa } })}
            onDeleteSoilAnalysis={deleteSoilAnalysis}
          />
        )}

        {selectedPropertyId && !selectedFieldId && (
          <PropertyDetail
            property={propertiesWithMeta.find((p) => p.id === selectedPropertyId)}
            fields={fieldsWithMeta.filter((f) => f.propertyId === selectedPropertyId)}
            onBack={closePropertyDetail}
            onAddField={() => setModal({ type: "field", data: { propertyId: selectedPropertyId } })}
            onEditField={(f) => setModal({ type: "field", data: f })}
            onDeleteField={deleteField}
            onOpenField={openField}
          />
        )}

        {view === "propriedades" && !selectedPropertyId && (
          <PropriedadesView
            properties={filteredProperties} clients={clients} search={propSearch} setSearch={setPropSearch}
            onAdd={() => setModal({ type: "property", data: null })}
            onEdit={(p) => setModal({ type: "property", data: p })}
            onDelete={deleteProperty}
            onOpen={openPropertyFromList}
            hasClients={clients.length > 0}
          />
        )}

        {view === "talhoes" && !selectedFieldId && (
          <TalhoesView
            fields={filteredFields} cultureFilter={cultureFilter} setCultureFilter={setCultureFilter}
            onAdd={() => setModal({ type: "field", data: null })}
            onEdit={(f) => setModal({ type: "field", data: f })}
            onDelete={deleteField}
            onOpen={openField}
            hasProperties={properties.length > 0}
          />
        )}

        {view === "agenda" && (
          <AgendaView
            tasks={tasks} team={team} teamAvatars={teamAvatars} clients={clients}
            onAdd={(date) => setModal({ type: "task", data: date ? { date } : null })}
            onEdit={(t) => setModal({ type: "task", data: t })}
            onDelete={deleteTask}
            onToggleDone={toggleTaskDone}
          />
        )}

        {view === "visitas" && (
          <VisitasView
            visits={visits} harvests={harvestsWithMeta}
            onAdd={() => setModal({ type: "visit", data: null })}
            onEdit={(v) => setModal({ type: "visit", data: v })}
            onDelete={deleteVisit}
            hasHarvests={harvests.length > 0}
          />
        )}

        {view === "solo" && (
          <SoilAnalysesView
            soilAnalyses={soilAnalyses} fields={fieldsWithMeta}
            onAdd={(fieldId) => setModal({ type: "soilAnalysis", data: { field: fieldsWithMeta.find((f) => f.id === fieldId), analysis: null } })}
            onEdit={(sa) => setModal({ type: "soilAnalysis", data: { field: fieldsWithMeta.find((f) => f.id === sa.fieldId), analysis: sa } })}
            onDelete={deleteSoilAnalysis}
          />
        )}

        {view === "equipe" && (
          <EquipeView
            team={team}
            teamAvatars={teamAvatars}
            isMaster={isMaster}
            onAdd={() => { setTeamError(""); setModal({ type: "team", data: null }); }}
            onEdit={(t) => { setTeamError(""); setModal({ type: "team", data: t }); }}
            onDelete={deleteTeamMember}
            onPromote={promoteToAdmin}
            onDemote={demoteToTecnico}
          />
        )}

        {view === "atividade" && (
          <ActivityLogView log={activityLog} />
        )}

        {view === "financeiro" && isFinance && (
          <FinanceiroView
            finances={finances} bonuses={bonuses} bills={bills} settings={settings}
            clients={clients} team={team} properties={properties} fields={fields}
            onAddFinance={() => setModal({ type: "finance", data: null })}
            onEditFinance={(f) => setModal({ type: "finance", data: f })}
            onDeleteFinance={deleteFinance}
            onAddBonus={() => setModal({ type: "bonus", data: null })}
            onEditBonus={(b) => setModal({ type: "bonus", data: b })}
            onDeleteBonus={deleteBonus}
            onAddBill={() => setModal({ type: "bill", data: null })}
            onEditBill={(b) => setModal({ type: "bill", data: b })}
            onDeleteBill={deleteBill}
            onChangeRate={updateCommissionRate}
            onChangeProjectRate={updateProjectShareRate}
            onReconcile={() => setModal({ type: "reconcile", data: null })}
          />
        )}

        {view === "configuracoes" && (
          <ConfiguracoesView
            varieties={varieties} pesticides={pesticides} fertilizers={fertilizers}
            pests={pests} diseases={diseases} weeds={weeds}
            onAddVariety={() => setModal({ type: "variety", data: null })}
            onEditVariety={(v) => setModal({ type: "variety", data: v })}
            onDeleteVariety={deleteVariety}
            onAddPesticide={() => setModal({ type: "pesticide", data: null })}
            onEditPesticide={(p) => setModal({ type: "pesticide", data: p })}
            onDeletePesticide={deletePesticide}
            onAddFertilizer={() => setModal({ type: "fertilizer", data: null })}
            onEditFertilizer={(f) => setModal({ type: "fertilizer", data: f })}
            onDeleteFertilizer={deleteFertilizer}
            onAddPest={() => setModal({ type: "pest", data: null })}
            onEditPest={(p) => setModal({ type: "pest", data: p })}
            onDeletePest={deletePest}
            onAddDisease={() => setModal({ type: "disease", data: null })}
            onEditDisease={(d) => setModal({ type: "disease", data: d })}
            onDeleteDisease={deleteDisease}
            onAddWeed={() => setModal({ type: "weed", data: null })}
            onEditWeed={(w) => setModal({ type: "weed", data: w })}
            onDeleteWeed={deleteWeed}
          />
        )}
      </div>

      {modal?.type === "client" && (
        <ClientModal data={modal.data} team={team} onSave={saveClient} onClose={() => setModal(null)} />
      )}
      {modal?.type === "property" && (
        <PropertyModal data={modal.data} clients={clients} onSave={saveProperty} onClose={() => setModal(null)} />
      )}
      {modal?.type === "field" && (
        <FieldModal data={modal.data} properties={properties} clients={clients} onSave={saveField} onClose={() => setModal(null)} />
      )}
      {modal?.type === "harvest" && (
        <HarvestModal data={modal.data} fields={fields} properties={properties} clients={clients} varieties={varieties} onSave={saveHarvest} onClose={() => setModal(null)} />
      )}
      {modal?.type === "visit" && (
        <VisitModal data={modal.data} harvests={harvestsWithMeta} team={team} onSave={saveVisit} onUploadPhoto={uploadVisitPhoto} onDeletePhoto={deleteVisitPhoto} onClose={() => setModal(null)} />
      )}
      {modal?.type === "variety" && (
        <VarietyModal data={modal.data} onSave={saveVariety} onClose={() => setModal(null)} />
      )}
      {modal?.type === "pesticide" && (
        <PesticideModal data={modal.data} onSave={savePesticide} onClose={() => setModal(null)} />
      )}
      {modal?.type === "fertilizer" && (
        <FertilizerModal data={modal.data} onSave={saveFertilizer} onClose={() => setModal(null)} />
      )}
      {modal?.type === "pest" && (
        <PestModal data={modal.data} onSave={savePest} onClose={() => setModal(null)} />
      )}
      {modal?.type === "disease" && (
        <DiseaseModal data={modal.data} onSave={saveDisease} onClose={() => setModal(null)} />
      )}
      {modal?.type === "weed" && (
        <WeedModal data={modal.data} onSave={saveWeed} onClose={() => setModal(null)} />
      )}
      {modal?.type === "team" && (
        <TeamMemberModal data={modal.data} avatarUrl={modal.data ? teamAvatars[modal.data.id] : null} error={teamError} onSave={saveTeamMember} onClose={() => setModal(null)} />
      )}
      {modal?.type === "teamCreated" && (
        <ColaboradorCreatedModal data={modal.data} onClose={() => setModal(null)} />
      )}
      {modal?.type === "task" && (
        <TaskModal data={modal.data} team={team} clients={clients} onSave={saveTask} onClose={() => setModal(null)} />
      )}
      {modal?.type === "clientAccess" && (
        <ClientAccessModal
          clientName={clients.find((c) => c.id === modal.data.clientId)?.name}
          clientId={modal.data.clientId}
          error={teamError}
          onSave={saveClientAccess}
          onClose={() => setModal(null)}
        />
      )}
      {modal?.type === "finance" && (
        <FinanceModal data={modal.data} clients={clients} team={team} onSave={saveFinance} onClose={() => setModal(null)} />
      )}
      {modal?.type === "bonus" && (
        <BonusModal data={modal.data} team={team} clients={clients} onSave={saveBonus} onClose={() => setModal(null)} />
      )}
      {modal?.type === "bill" && (
        <BillModal data={modal.data} categoryMemory={categoryMemory} onSave={saveBill} onClose={() => setModal(null)} />
      )}
      {modal?.type === "soilAnalysis" && (
        <SoilAnalysisModal
          data={modal.data.analysis} field={modal.data.field}
          onSave={saveSoilAnalysis} onClose={() => setModal(null)}
        />
      )}
      {modal?.type === "reconcile" && (
        <ReconciliationModal
          finances={finances} bills={bills} clients={clients} categoryMemory={categoryMemory}
          onConfirmMatch={markFinancePaid}
          onConfirmBillMatch={markBillPaid}
          onCreateFromTransaction={(t) => setModal({ type: "finance", data: { amount: t.amount, date: t.date, referenceMonth: t.date.slice(0, 7), status: "pago" } })}
          onCreateBillFromTransaction={(t, category) => setModal({ type: "bill", data: { description: t.description || "", category: category || "", amount: t.amount, date: t.date, referenceMonth: t.date.slice(0, 7), status: "pago" } })}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  );
}

function StatCard({ label, value, sub, accent }) {
  return (
    <div style={{ background: "#161D19", border: "1px solid #232B25", borderRadius: 12, padding: "16px 18px", flex: 1, minWidth: 140 }}>
      <div style={{ fontSize: 9.5, color: "#9BA298", fontWeight: 600, marginBottom: 8, textTransform: "uppercase", letterSpacing: ".03em" }}>{label}</div>
      <div style={{ fontFamily: "'Manrope', sans-serif", fontSize: 19, fontWeight: 800, color: accent || "#F2F0E6" }}>{value}</div>
      {sub && <div style={{ fontSize: 9.5, color: "#9BA298", marginTop: 3 }}>{sub}</div>}
    </div>
  );
}

function Dashboard({ totals, recentVisits, clients, properties, fields, onOpenField, onOpenClient, isFinance, monthFinanceSummary }) {
  const pctSoja = totals.areaPlantada ? Math.round((totals.areaSoja / totals.areaPlantada) * 100) : 0;
  const lateClients = clients
    .filter((c) => c.visitStatus === "late" || c.visitStatus === "none")
    .sort((a, b) => (a.lastVisitDate || "").localeCompare(b.lastVisitDate || ""));
  const monthLabel = new Date().toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
  return (
    <div>
      <h2 style={{ fontFamily: "'Manrope', sans-serif", fontSize: 17.5, fontWeight: 800, color: "#F2F0E6", margin: "0 0 4px" }}>Painel geral</h2>
      <p style={{ color: "#9BA298", fontSize: 11, margin: "0 0 22px" }}>Visão geral das lavouras acompanhadas</p>

      <div style={{ display: "flex", gap: 14, marginBottom: 22, flexWrap: "wrap" }}>
        <StatCard label="Clientes" value={clients.length} />
        <StatCard label="Propriedades" value={properties.length} />
        <StatCard label="Talhões" value={fields.length} />
        <StatCard label="Safras ativas" value={totals.activeHarvestCount} accent="#7BC142" />
        <StatCard label="Área total" value={totals.areaTotal.toLocaleString("pt-BR") + " ha"} sub={totals.areaPlantada > 0 ? `${totals.areaPlantada.toLocaleString("pt-BR")} ha plantados` : "nenhuma área plantada ainda"} />
        <StatCard label="Visitas · 7 dias" value={totals.visitsWeek} />
      </div>

      {isFinance && monthFinanceSummary && (
        <div style={{ display: "flex", gap: 14, marginBottom: 22, flexWrap: "wrap" }}>
          <StatCard label={`Entradas · ${monthLabel}`} value={fmtCurrency(monthFinanceSummary.totalRecebido)} accent="#7BC142"
            sub={monthFinanceSummary.totalPendente > 0 ? `${fmtCurrency(monthFinanceSummary.totalPendente)} pendente` : "tudo recebido"} />
          <StatCard label={`Saídas previstas · ${monthLabel}`} value={fmtCurrency(monthFinanceSummary.totalSaidasPrevistas)} accent="#E3B455"
            sub={`Pró-labore ${fmtCurrency(monthFinanceSummary.totalProLabore)} + despesas ${fmtCurrency(monthFinanceSummary.totalDespesasDoMes)}`} />
        </div>
      )}

      <div style={{ display: "flex", gap: 18, alignItems: "stretch", marginBottom: 24, flexWrap: "wrap" }}>
        <div style={{ background: "#161D19", border: "1px solid #232B25", borderRadius: 12, padding: 18, flex: 1, minWidth: 260 }}>
          <div style={{ fontSize: 10.5, fontWeight: 600, color: "#D6D3C7", marginBottom: 12 }}>Área por cultura</div>
          {totals.areaPlantada === 0 ? (
            <div style={{ color: "#6B7268", fontSize: 10.5 }}>Nenhuma safra em andamento ainda.</div>
          ) : (
            <>
              <div style={{ display: "flex", height: 14, borderRadius: 7, overflow: "hidden", marginBottom: 10 }}>
                <div style={{ width: pctSoja + "%", background: CULTURE_META.Soja.color }} />
                <div style={{ width: (100 - pctSoja) + "%", background: CULTURE_META.Milho.color }} />
              </div>
              <div style={{ display: "flex", gap: 18, fontSize: 10.5 }}>
                <span style={{ display: "flex", alignItems: "center", gap: 6, color: "#D6D3C7" }}>
                  <span style={{ width: 9, height: 9, borderRadius: 3, background: CULTURE_META.Soja.color, display: "inline-block" }} />
                  Soja — {totals.areaSoja.toLocaleString("pt-BR")} ha
                </span>
                <span style={{ display: "flex", alignItems: "center", gap: 6, color: "#D6D3C7" }}>
                  <span style={{ width: 9, height: 9, borderRadius: 3, background: CULTURE_META.Milho.color, display: "inline-block" }} />
                  Milho — {totals.areaMilho.toLocaleString("pt-BR")} ha
                </span>
              </div>
            </>
          )}
        </div>

        <div style={{ background: "#161D19", border: "1px solid #232B25", borderRadius: 12, padding: 18, flex: 1, minWidth: 260 }}>
          <div style={{ fontSize: 10.5, fontWeight: 600, color: "#D6D3C7", marginBottom: 12 }}>Visita semanal por gestor</div>
          {lateClients.length === 0 ? (
            <div style={{ color: "#6B7268", fontSize: 10.5 }}>Todos os clientes estão em dia com a visita semanal.</div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {lateClients.map((c) => (
                <div
                  key={c.id}
                  onClick={() => onOpenClient && onOpenClient(c.id)}
                  style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, cursor: onOpenClient ? "pointer" : "default" }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 9, minWidth: 0 }}>
                    {c.gestorName && <Avatar name={c.gestorName} url={c.gestorAvatar} size={26} />}
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: 10.5, color: "#D6D3C7", fontWeight: 600 }}>{c.name}</div>
                      <div style={{ fontSize: 9.5, color: "#6B7268" }}>
                        {c.gestorName ? `Gestor: ${c.gestorName}` : "Sem gestor definido"}
                        {c.lastVisitDate ? ` · última visita ${fmtDate(c.lastVisitDate)}` : ""}
                      </div>
                    </div>
                  </div>
                  <VisitStatusBadge status={c.visitStatus} />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <FieldsOverviewMap fields={fields} onOpenField={onOpenField} />

      <div style={{ background: "#161D19", border: "1px solid #232B25", borderRadius: 12, padding: 18, marginTop: 24 }}>
        <div style={{ fontSize: 10.5, fontWeight: 600, color: "#D6D3C7", marginBottom: 10 }}>Visitas recentes</div>
        {recentVisits.length === 0 ? (
          <div style={{ color: "#6B7268", fontSize: 10.5 }}>Nenhuma visita registrada ainda.</div>
        ) : (
          <table>
            <thead><tr><th>Data</th><th>Cliente / Propriedade / Talhão</th><th>Cultura</th><th>Estágio</th><th>Técnico</th></tr></thead>
            <tbody>
              {recentVisits.map((v) => (
                <tr key={v.id}>
                  <td style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10 }}>{fmtDate(v.date)}</td>
                  <td>{v.clientName} <span style={{ color: "#6B7268" }}>· {v.propertyName} · {v.fieldName}</span></td>
                  <td>{v.culture && <CultureBadge culture={v.culture} />}</td>
                  <td>{v.culture && <StageProgress culture={v.culture} stage={v.stage} />}</td>
                  <td>{v.technician}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

function FieldsOverviewMap({ fields, onOpenField }) {
  const [hovered, setHovered] = useState(null);
  const geoFields = fields.filter((f) => f.fieldMap?.mode === "kml" && f.fieldMap.points?.length >= 3);
  const imageFields = fields.filter((f) => f.fieldMap?.mode === "image" && f.fieldMap.points?.length >= 3);
  const bounds = geoFields.flatMap((f) => f.fieldMap.points.map(([lat, lng]) => [lat, lng]));

  return (
    <div style={{ background: "#161D19", border: "1px solid #232B25", borderRadius: 12, padding: 18 }}>
      <div style={{ fontSize: 10.5, fontWeight: 600, color: "#D6D3C7", marginBottom: 4 }}>Mapa dos talhões</div>
      <div style={{ fontSize: 9.5, color: "#6B7268", marginBottom: 12 }}>
        Só mostra talhões com área definida por KML — coordenadas reais, então dá pra combinar todos num mapa só.
      </div>
      {geoFields.length === 0 ? (
        <div style={{ color: "#6B7268", fontSize: 10.5 }}>
          Nenhum talhão com KML importado ainda. Defina a área de um talhão usando KML para ele aparecer aqui.
        </div>
      ) : (
        <div style={{ height: 380, borderRadius: 8, overflow: "hidden", border: "1px solid #232B25" }}>
          <MapContainer bounds={bounds} boundsOptions={{ padding: [24, 24] }} style={{ height: "100%", width: "100%" }} scrollWheelZoom>
            <LayersControl position="topright">
              <LayersControl.BaseLayer checked name="Satélite">
                <TileLayer
                  attribution="Tiles &copy; Esri — Source: Esri, Maxar, Earthstar Geographics"
                  url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
                  maxZoom={19}
                />
              </LayersControl.BaseLayer>
              <LayersControl.BaseLayer name="Ruas">
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  maxZoom={19}
                />
              </LayersControl.BaseLayer>
            </LayersControl>
            {geoFields.map((f) => {
              const positions = f.fieldMap.points.map(([lat, lng]) => [lat, lng]);
              const color = f.activeHarvest ? CULTURE_META[f.activeHarvest.culture]?.color || "#7BC142" : "#9BA298";
              const isHovered = hovered === f.id;
              return (
                <Polygon
                  key={f.id}
                  positions={positions}
                  pathOptions={{ color, weight: isHovered ? 2.5 : 1.5, fillColor: color, fillOpacity: isHovered ? 0.45 : 0.28 }}
                  eventHandlers={{
                    click: () => onOpenField && onOpenField(f.id),
                    mouseover: () => setHovered(f.id),
                    mouseout: () => setHovered(null),
                  }}
                >
                  <Tooltip permanent direction="center" className="field-map-label">{f.name}</Tooltip>
                </Polygon>
              );
            })}
          </MapContainer>
        </div>
      )}
      {imageFields.length > 0 && (
        <div style={{ fontSize: 9.5, color: "#6B7268", marginTop: 10 }}>
          {imageFields.length} talhão(ões) com área definida por imagem não {imageFields.length > 1 ? "entram" : "entra"} neste mapa (sem coordenadas reais) — abra cada um para visualizar.
        </div>
      )}
    </div>
  );
}

function ClientPortalApp({ data, error, onSignOut }) {
  const [viewingAnalysisId, setViewingAnalysisId] = useState(null);
  const shellStyle = {
    fontFamily: "'Inter', -apple-system, sans-serif", minHeight: 640,
    background: "#0E1310", borderRadius: 14, border: "1px solid #232B25", padding: "26px 32px",
  };
  const fontImport = (
    <style>{`
      @import url('https://fonts.googleapis.com/css2?family=Manrope:wght@600;700;800&family=Inter:wght@400;500;600;700&family=IBM+Plex+Mono:wght@500;600&display=swap');
      * { box-sizing: border-box; }
      table { border-collapse: collapse; width: 100%; }
      th { text-align: left; font-size: 10px; text-transform: uppercase; letter-spacing: .04em; color: #6B7268; padding: 10px 12px; border-bottom: 1px solid #232B25; }
      td { padding: 12px; border-bottom: 1px solid #212922; font-size: 10.5px; color: #D6D3C7; vertical-align: middle; }
      tr:last-child td { border-bottom: none; }
      .leaflet-container { background: #0E1310; font-family: 'IBM Plex Mono', monospace; }
      .leaflet-control-layers { background: #161D19 !important; border: 1px solid #232B25 !important; color: #D6D3C7; }
      .leaflet-control-layers-toggle { filter: invert(1); }
      .leaflet-control-layers label { color: #D6D3C7; font-size: 11px; }
      .leaflet-control-zoom a { background: #161D19 !important; color: #D6D3C7 !important; border-color: #232B25 !important; }
      .leaflet-control-attribution { background: rgba(14,19,16,0.75) !important; color: #6B7268 !important; }
      .leaflet-control-attribution a { color: #9BA298 !important; }
      .field-map-label { background: rgba(14,19,16,0.85) !important; border: none !important; box-shadow: none !important; color: #F2F0E6 !important; font-size: 10px; font-family: 'IBM Plex Mono', monospace; padding: 2px 6px !important; }
      .field-map-label::before { display: none !important; }
    `}</style>
  );

  if (error) {
    return (
      <div style={{ ...shellStyle, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 14, color: "#9BA298" }}>
        {fontImport}
        <AlertTriangle size={28} color="#E38B84" />
        <div style={{ fontSize: 12, textAlign: "center", maxWidth: 320 }}>{error}</div>
        <GhostBtn onClick={onSignOut}>Sair</GhostBtn>
      </div>
    );
  }
  if (!data) {
    return (
      <div style={{ ...shellStyle, display: "flex", alignItems: "center", justifyContent: "center", color: "#9BA298" }}>
        {fontImport}
        Carregando seus dados…
      </div>
    );
  }

  const { client, gestor, properties, fields, harvests, visits, documents, soilAnalyses = [] } = data;

  const fieldsWithMeta = fields.map((f) => {
    const fieldHarvests = harvests
      .filter((h) => h.fieldId === f.id)
      .map((h) => ({ ...h, status: h.harvestDate ? "Colhida" : "Em andamento" }))
      .sort((a, b) => (b.plantingDate || "").localeCompare(a.plantingDate || ""));
    const activeHarvest = fieldHarvests.find((h) => h.status === "Em andamento") || null;
    return { ...f, harvests: fieldHarvests, activeHarvest, areaHa: fieldAreaHa(f) };
  });

  const propertiesWithMeta = properties.map((p) => {
    const propFields = fieldsWithMeta.filter((f) => f.propertyId === p.id);
    return { ...p, fields: propFields, areaTotal: propFields.reduce((s, f) => s + f.areaHa, 0) };
  });

  const areaTotal = fieldsWithMeta.reduce((s, f) => s + f.areaHa, 0);

  const recentVisits = [...visits]
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 12)
    .map((v) => {
      const harvest = harvests.find((h) => h.id === v.harvestId);
      const field = harvest ? fields.find((f) => f.id === harvest.fieldId) : null;
      return { ...v, fieldName: field?.name || "—", culture: harvest?.culture || null };
    });

  return (
    <div style={shellStyle}>
      {fontImport}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 26, flexWrap: "wrap", gap: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <img src={LOGO_MARK_SRC} alt="Semear" style={{ height: 32 }} />
          <div>
            <h2 style={{ fontFamily: "'Manrope', sans-serif", fontSize: 17.5, fontWeight: 800, color: "#F2F0E6", margin: "0 0 2px" }}>{client.name}</h2>
            <p style={{ color: "#9BA298", fontSize: 10.5, margin: 0 }}>Painel do cliente · Semear Consultoria Agropecuária</p>
          </div>
        </div>
        <GhostBtn onClick={onSignOut}>Sair</GhostBtn>
      </div>

      <div style={{ display: "flex", gap: 14, marginBottom: 22, flexWrap: "wrap" }}>
        <StatCard label="Propriedades" value={properties.length} />
        <StatCard label="Talhões" value={fields.length} />
        <StatCard label="Área total" value={areaTotal.toLocaleString("pt-BR") + " ha"} />
        <StatCard label="Visitas registradas" value={visits.length} />
      </div>

      {gestor && (
        <div style={{ background: "#161D19", border: "1px solid #232B25", borderRadius: 12, padding: 16, marginBottom: 22, display: "flex", alignItems: "center", gap: 12 }}>
          <Avatar name={gestor.name} url={gestor.avatar} size={40} />
          <div>
            <div style={{ fontSize: 11.5, fontWeight: 600, color: "#F2F0E6" }}>{gestor.name}</div>
            <div style={{ fontSize: 10, color: "#9BA298" }}>{gestor.title || "Gestor responsável"}{gestor.phone ? ` · ${gestor.phone}` : ""}</div>
          </div>
        </div>
      )}

      <FieldsOverviewMap fields={fieldsWithMeta} onOpenField={null} />

      <div style={{ background: "#161D19", border: "1px solid #232B25", borderRadius: 12, padding: 18, marginTop: 24 }}>
        <div style={{ fontSize: 10.5, fontWeight: 600, color: "#D6D3C7", marginBottom: 12 }}>Propriedades e talhões</div>
        {propertiesWithMeta.length === 0 ? (
          <div style={{ color: "#6B7268", fontSize: 10.5 }}>Nenhuma propriedade cadastrada ainda.</div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {propertiesWithMeta.map((p) => (
              <div key={p.id}>
                <div style={{ fontSize: 11, fontWeight: 700, color: "#F2F0E6", marginBottom: 6 }}>
                  {p.name} <span style={{ color: "#6B7268", fontWeight: 500 }}>· {p.areaTotal.toLocaleString("pt-BR")} ha</span>
                </div>
                {p.fields.length === 0 ? (
                  <div style={{ color: "#6B7268", fontSize: 10, marginBottom: 6 }}>Nenhum talhão cadastrado.</div>
                ) : (
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 8 }}>
                    {p.fields.map((f) => (
                      <div key={f.id} style={{ background: "#10140F", border: "1px solid #212922", borderRadius: 8, padding: 10 }}>
                        <div style={{ fontSize: 10.5, fontWeight: 600, color: "#D6D3C7", marginBottom: 4 }}>{f.name}</div>
                        <div style={{ fontSize: 9.5, color: "#9BA298", marginBottom: 6 }}>{f.areaHa.toLocaleString("pt-BR")} ha</div>
                        {f.activeHarvest ? <CultureBadge culture={f.activeHarvest.culture} /> : <span style={{ fontSize: 9, color: "#6B7268" }}>Sem safra ativa</span>}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <div style={{ background: "#161D19", border: "1px solid #232B25", borderRadius: 12, padding: 18, marginTop: 24 }}>
        <div style={{ fontSize: 10.5, fontWeight: 600, color: "#D6D3C7", marginBottom: 10 }}>Visitas recentes</div>
        {recentVisits.length === 0 ? (
          <div style={{ color: "#6B7268", fontSize: 10.5 }}>Nenhuma visita registrada ainda.</div>
        ) : (
          <table>
            <thead><tr><th>Data</th><th>Talhão</th><th>Cultura</th><th>Estágio</th><th>Técnico</th><th>Fotos</th></tr></thead>
            <tbody>
              {recentVisits.map((v) => (
                <tr key={v.id}>
                  <td style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10 }}>{fmtDate(v.date)}</td>
                  <td>{v.fieldName}</td>
                  <td>{v.culture && <CultureBadge culture={v.culture} />}</td>
                  <td>{v.culture && <StageProgress culture={v.culture} stage={v.stage} />}</td>
                  <td>{v.technician}</td>
                  <td>
                    {v.photos && v.photos.length > 0 ? (
                      <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
                        {v.photos.slice(0, 3).map((p) => (
                          <a key={p.id} href={p.url} target="_blank" rel="noreferrer">
                            <img src={p.url} alt="" style={{ width: 28, height: 28, objectFit: "cover", borderRadius: 4, display: "block" }} />
                          </a>
                        ))}
                        {v.photos.length > 3 && <span style={{ fontSize: 9, color: "#9BA298" }}>+{v.photos.length - 3}</span>}
                      </div>
                    ) : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div style={{ background: "#161D19", border: "1px solid #232B25", borderRadius: 12, padding: 18, marginTop: 24 }}>
        <div style={{ fontSize: 10.5, fontWeight: 600, color: "#D6D3C7", marginBottom: 10 }}>Análises de Solo</div>
        {soilAnalyses.length === 0 ? (
          <div style={{ color: "#6B7268", fontSize: 10.5 }}>Nenhuma análise de solo registrada ainda.</div>
        ) : (
          <table>
            <thead><tr><th>Data</th><th>Talhão</th><th>Identificação</th><th>Pontos</th><th></th></tr></thead>
            <tbody>
              {[...soilAnalyses].sort((a, b) => (b.date || "").localeCompare(a.date || "")).map((s) => {
                const soilField = fieldsWithMeta.find((f) => f.id === s.fieldId);
                return (
                  <tr key={s.id}>
                    <td style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10 }}>{fmtDate(s.date)}</td>
                    <td>{soilField?.name || "—"}</td>
                    <td>{s.label || "—"}</td>
                    <td>{s.points.length}</td>
                    <td>
                      <GhostBtn onClick={() => setViewingAnalysisId(s.id)}>Ver</GhostBtn>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      <div style={{ background: "#161D19", border: "1px solid #232B25", borderRadius: 12, padding: 18, marginTop: 24 }}>
        <div style={{ fontSize: 10.5, fontWeight: 600, color: "#D6D3C7", marginBottom: 10 }}>Documentos</div>
        {documents.length === 0 ? (
          <div style={{ color: "#6B7268", fontSize: 10.5 }}>Nenhum documento disponível ainda.</div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {documents.map((d) => (
              <a key={d.id} href={d.url} target="_blank" rel="noreferrer" style={{
                display: "flex", justifyContent: "space-between", alignItems: "center", textDecoration: "none",
                background: "#10140F", border: "1px solid #212922", borderRadius: 8, padding: "10px 12px"
              }}>
                <span style={{ fontSize: 10.5, color: "#D6D3C7", fontWeight: 600 }}>{d.title}</span>
                <span style={{ fontSize: 9.5, color: "#6B7268" }}>{fmtDate(d.uploadedAt?.slice(0, 10))}</span>
              </a>
            ))}
          </div>
        )}
      </div>

      {viewingAnalysisId && (() => {
        const viewingAnalysis = soilAnalyses.find((s) => s.id === viewingAnalysisId);
        const viewingField = viewingAnalysis ? fieldsWithMeta.find((f) => f.id === viewingAnalysis.fieldId) : null;
        if (!viewingAnalysis || !viewingField) return null;
        return (
          <SoilAnalysisModal
            data={viewingAnalysis} field={viewingField} readOnly
            onSave={() => {}} onClose={() => setViewingAnalysisId(null)}
          />
        );
      })()}
    </div>
  );
}

function EmptyState({ icon: Icon, title, sub, action }) {
  return (
    <div style={{ textAlign: "center", padding: "60px 20px", color: "#9BA298" }}>
      <Icon size={30} style={{ marginBottom: 10, opacity: 0.5 }} />
      <div style={{ fontWeight: 600, color: "#D6D3C7", marginBottom: 4 }}>{title}</div>
      <div style={{ fontSize: 10.5, marginBottom: 16 }}>{sub}</div>
      {action}
    </div>
  );
}

function ClientesView({ clients, properties, search, setSearch, onAdd, onEdit, onDelete, onOpen }) {
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18, gap: 12 }}>
        <div>
          <h2 style={{ fontFamily: "'Manrope', sans-serif", fontSize: 17.5, fontWeight: 800, color: "#F2F0E6", margin: 0 }}>Clientes</h2>
        </div>
        <PrimaryBtn onClick={onAdd}><Plus size={16} /> Novo cliente</PrimaryBtn>
      </div>
      <div style={{ position: "relative", maxWidth: 320, marginBottom: 16 }}>
        <Search size={15} style={{ position: "absolute", left: 10, top: 10, color: "#6B7268" }} />
        <input placeholder="Buscar cliente…" value={search} onChange={(e) => setSearch(e.target.value)}
          style={{ ...inputStyle, paddingLeft: 32 }} />
      </div>
      {clients.length === 0 ? (
        <EmptyState icon={Users} title="Nenhum cliente cadastrado" sub="Cadastre o primeiro produtor para começar a acompanhar as lavouras."
          action={<PrimaryBtn onClick={onAdd}><Plus size={16} /> Novo cliente</PrimaryBtn>} />
      ) : (
        <div style={{ background: "#161D19", border: "1px solid #232B25", borderRadius: 12, overflow: "hidden" }}>
          <table>
            <thead><tr><th>Nome</th><th>Telefone</th><th>Cidade</th><th>Propriedades</th><th>Gestor</th><th>Visita</th><th></th></tr></thead>
            <tbody>
              {clients.map((c) => {
                const count = properties.filter((p) => p.clientId === c.id).length;
                return (
                  <tr key={c.id} style={{ cursor: "pointer" }} onClick={() => onOpen(c.id)}>
                    <td style={{ fontWeight: 600, color: "#F2F0E6" }}>{c.name}</td>
                    <td>{c.phone || "—"}</td>
                    <td>{c.city || "—"}</td>
                    <td>{count}</td>
                    <td>
                      {c.gestorName ? (
                        <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                          <Avatar name={c.gestorName} url={c.gestorAvatar} size={22} />
                          {c.gestorName}
                        </div>
                      ) : "—"}
                    </td>
                    <td><VisitStatusBadge status={c.visitStatus} /></td>
                    <td onClick={(e) => e.stopPropagation()}>
                      <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
                        <button onClick={() => onEdit(c)} style={iconBtnStyle}><Pencil size={14} /></button>
                        <button onClick={() => { if (confirm(`Remover ${c.name} e todas as propriedades/talhões/visitas vinculados?`)) onDelete(c.id); }} style={iconBtnStyle}><Trash2 size={14} /></button>
                        <ChevronRight size={16} color="#6B7268" />
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function ClientDetail({
  client, properties, onBack, onAddProperty, onEditProperty, onDeleteProperty, onOpenProperty,
  clientAccess, isMaster, onCreateAccess, onDeleteAccess,
  documents, onUploadDocument, onDeleteDocument,
}) {
  if (!client) return null;
  return (
    <div>
      <button onClick={onBack} style={{ background: "none", border: "none", color: "#9BA298", cursor: "pointer", display: "flex", alignItems: "center", gap: 5, fontSize: 10.5, marginBottom: 14, padding: 0 }}>
        <ArrowLeft size={14} /> Todos os clientes
      </button>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 22 }}>
        <div>
          <h2 style={{ fontFamily: "'Manrope', sans-serif", fontSize: 17.5, fontWeight: 800, color: "#F2F0E6", margin: "0 0 6px" }}>{client.name}</h2>
          <div style={{ display: "flex", gap: 16, fontSize: 10.5, color: "#9BA298", marginBottom: 8 }}>
            {client.phone && <span style={{ display: "flex", alignItems: "center", gap: 5 }}><Phone size={13} /> {client.phone}</span>}
            {client.city && <span style={{ display: "flex", alignItems: "center", gap: 5 }}><MapPin size={13} /> {client.city}</span>}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 10.5, color: "#9BA298" }}>
            <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
              {client.gestorName ? <Avatar name={client.gestorName} url={client.gestorAvatar} size={18} /> : <UserCog size={13} />}
              {client.gestorName ? `Gestor: ${client.gestorName}` : "Sem gestor definido"}
            </span>
            <VisitStatusBadge status={client.visitStatus} />
          </div>
        </div>
        <PrimaryBtn onClick={onAddProperty}><Plus size={16} /> Nova propriedade</PrimaryBtn>
      </div>

      {properties.length === 0 ? (
        <EmptyState icon={Home} title="Nenhuma propriedade cadastrada" sub="Cadastre as propriedades deste cliente para depois adicionar os talhões." />
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 12 }}>
          {properties.map((p) => (
            <div key={p.id} onClick={() => onOpenProperty(p.id)} style={{ background: "#161D19", border: "1px solid #232B25", borderRadius: 12, padding: 16, cursor: "pointer" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                <div style={{ fontWeight: 600, color: "#F2F0E6", fontSize: 11.5 }}>{p.name}</div>
                <ChevronRight size={16} color="#6B7268" />
              </div>
              {p.location && (
                <div style={{ fontSize: 10, color: "#9BA298", marginBottom: 6, display: "flex", alignItems: "center", gap: 5 }}>
                  <MapPin size={12} /> {p.location}
                </div>
              )}
              <div style={{ fontSize: 10, color: "#9BA298", marginBottom: 12 }}>
                {p.fieldCount} talhão(ões) · {p.areaTotal.toLocaleString("pt-BR")} ha
              </div>
              <div style={{ display: "flex", gap: 6 }} onClick={(e) => e.stopPropagation()}>
                <button onClick={() => onEditProperty(p)} style={{ ...iconBtnStyle, flex: 1, display: "flex", justifyContent: "center" }}><Pencil size={13} /></button>
                <button onClick={() => { if (confirm(`Remover propriedade ${p.name} e seus talhões/visitas?`)) onDeleteProperty(p.id); }} style={{ ...iconBtnStyle, flex: 1, display: "flex", justifyContent: "center" }}><Trash2 size={13} /></button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div style={{ background: "#161D19", border: "1px solid #232B25", borderRadius: 12, padding: 18, marginTop: 24 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
          <div style={{ fontSize: 10.5, fontWeight: 600, color: "#D6D3C7" }}>Acesso do cliente ao painel</div>
          {isMaster && !clientAccess && (
            <GhostBtn onClick={onCreateAccess}><Plus size={14} /> Criar acesso</GhostBtn>
          )}
        </div>
        {clientAccess ? (
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <div style={{ fontSize: 10.5, color: "#D6D3C7", fontWeight: 600 }}>{clientAccess.name}</div>
              <div style={{ fontSize: 9.5, color: "#6B7268" }}>{clientAccess.email}</div>
            </div>
            {isMaster && (
              <button onClick={() => { if (confirm("Remover o acesso deste cliente ao painel?")) onDeleteAccess(clientAccess.id); }} style={iconBtnStyle}><Trash2 size={14} /></button>
            )}
          </div>
        ) : (
          <div style={{ color: "#6B7268", fontSize: 10.5 }}>
            Este cliente ainda não tem login — ele não consegue ver as próprias fazendas, talhões, visitas e documentos no painel.
          </div>
        )}
      </div>

      <ClientDocuments clientId={client.id} documents={documents} onUpload={onUploadDocument} onDelete={onDeleteDocument} />
    </div>
  );
}

function ClientDocuments({ clientId, documents, onUpload, onDelete }) {
  const [file, setFile] = useState(null);
  const [title, setTitle] = useState("");
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const fileInputRef = useRef(null);

  async function handleUpload() {
    if (!file) return;
    setUploading(true);
    setError("");
    const r = await onUpload({ clientId, file, title });
    setUploading(false);
    if (r?.error) { setError(r.error); return; }
    setFile(null);
    setTitle("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function fmtSize(bytes) {
    if (!bytes) return "";
    if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  return (
    <div style={{ background: "#161D19", border: "1px solid #232B25", borderRadius: 12, padding: 18, marginTop: 24 }}>
      <div style={{ fontSize: 10.5, fontWeight: 600, color: "#D6D3C7", marginBottom: 12 }}>Documentos (laudos, contratos, fotos)</div>
      <div style={{ display: "flex", gap: 8, marginBottom: 14, flexWrap: "wrap", alignItems: "center" }}>
        <input ref={fileInputRef} type="file" onChange={(e) => setFile(e.target.files[0] || null)} style={{ fontSize: 10.5, color: "#D6D3C7" }} />
        <input style={{ ...inputStyle, width: 180 }} placeholder="Nome do documento (opcional)" value={title} onChange={(e) => setTitle(e.target.value)} />
        <PrimaryBtn onClick={handleUpload} disabled={!file || uploading}>
          {uploading ? "Enviando…" : "Enviar"}
        </PrimaryBtn>
      </div>
      {error && <div style={{ fontSize: 10.5, color: "#E38B84", marginBottom: 10 }}>{error}</div>}
      {documents.length === 0 ? (
        <div style={{ color: "#6B7268", fontSize: 10.5 }}>Nenhum documento enviado ainda.</div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {documents.map((d) => (
            <div key={d.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "#10140F", border: "1px solid #212922", borderRadius: 8, padding: "9px 12px" }}>
              <a href={d.url} target="_blank" rel="noreferrer" style={{ fontSize: 10.5, color: "#D6D3C7", fontWeight: 600, textDecoration: "none" }}>{d.title}</a>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ fontSize: 9.5, color: "#6B7268" }}>{fmtSize(d.sizeBytes)} · {fmtDate(d.uploadedAt?.slice(0, 10))}</span>
                <button onClick={() => { if (confirm(`Remover o documento "${d.title}"?`)) onDelete(d); }} style={iconBtnStyle}><Trash2 size={13} /></button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const SOIL_NUTRIENTS = [
  { key: "ph", label: "pH", unit: "" },
  { key: "p", label: "Fósforo (P)", unit: "mg/dm³" },
  { key: "k", label: "Potássio (K)", unit: "mg/dm³" },
  { key: "ca", label: "Cálcio (Ca)", unit: "cmolc/dm³" },
  { key: "mg", label: "Magnésio (Mg)", unit: "cmolc/dm³" },
  { key: "al", label: "Alumínio (Al)", unit: "cmolc/dm³" },
  { key: "ctc", label: "CTC", unit: "cmolc/dm³" },
  { key: "v", label: "Saturação de bases (V%)", unit: "%" },
  { key: "mo", label: "Matéria orgânica", unit: "g/dm³" },
  { key: "s", label: "Enxofre (S)", unit: "mg/dm³" },
];

function pointInPolygon(lat, lng, polygon) {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const [yi, xi] = polygon[i];
    const [yj, xj] = polygon[j];
    const intersect = (yi > lat) !== (yj > lat) && lng < ((xj - xi) * (lat - yi)) / (yj - yi) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

function idwInterpolate(lat, lng, points, valueKey, power = 2) {
  let weightedSum = 0, weightSum = 0;
  for (const p of points) {
    const val = Number(p[valueKey]);
    if (p[valueKey] === undefined || p[valueKey] === "" || Number.isNaN(val)) continue;
    const d = Math.hypot(p.lat - lat, p.lng - lng);
    if (d < 1e-9) return val;
    const w = 1 / Math.pow(d, power);
    weightedSum += w * val;
    weightSum += w;
  }
  return weightSum > 0 ? weightedSum / weightSum : null;
}

function heatColor(t) {
  const stops = [[0, [214, 69, 65]], [0.5, [227, 180, 85]], [1, [123, 193, 66]]];
  for (let i = 0; i < stops.length - 1; i++) {
    const [t0, c0] = stops[i], [t1, c1] = stops[i + 1];
    if (t >= t0 && t <= t1) {
      const f = t1 > t0 ? (t - t0) / (t1 - t0) : 0;
      return [
        Math.round(c0[0] + f * (c1[0] - c0[0])),
        Math.round(c0[1] + f * (c1[1] - c0[1])),
        Math.round(c0[2] + f * (c1[2] - c0[2])),
      ];
    }
  }
  return stops[stops.length - 1][1];
}

function buildHeatOverlay(polygon, points, valueKey, resolution = 70) {
  if (!polygon || polygon.length < 3) return null;
  const values = points
    .map((p) => Number(p[valueKey]))
    .filter((v) => isValidNumber(v));
  if (values.length === 0) return null;
  const minV = Math.min(...values), maxV = Math.max(...values);
  const lats = polygon.map((p) => p[0]);
  const lngs = polygon.map((p) => p[1]);
  const minLat = Math.min(...lats), maxLat = Math.max(...lats);
  const minLng = Math.min(...lngs), maxLng = Math.max(...lngs);
  const w = resolution, h = resolution;
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  const imgData = ctx.createImageData(w, h);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const lat = maxLat - (y / (h - 1)) * (maxLat - minLat);
      const lng = minLng + (x / (w - 1)) * (maxLng - minLng);
      const idx = (y * w + x) * 4;
      if (!pointInPolygon(lat, lng, polygon)) continue;
      const val = idwInterpolate(lat, lng, points, valueKey);
      if (val === null) continue;
      const t = maxV > minV ? (val - minV) / (maxV - minV) : 0.5;
      const [r, g, b] = heatColor(t);
      imgData.data[idx] = r;
      imgData.data[idx + 1] = g;
      imgData.data[idx + 2] = b;
      imgData.data[idx + 3] = 210;
    }
  }
  ctx.putImageData(imgData, 0, 0);
  return { dataUrl: canvas.toDataURL(), bounds: [[minLat, minLng], [maxLat, maxLng]], minV, maxV };
}

function isValidNumber(v) {
  return typeof v === "number" && !Number.isNaN(v);
}

function MapClickCapture({ onClick }) {
  useMapEvents({ click(e) { onClick(e.latlng.lat, e.latlng.lng); } });
  return null;
}

function generateSamplingGrid(polygon, hectaresPerPoint) {
  const lats = polygon.map((p) => p[0]);
  const lngs = polygon.map((p) => p[1]);
  const minLat = Math.min(...lats), maxLat = Math.max(...lats);
  const minLng = Math.min(...lngs), maxLng = Math.max(...lngs);
  const meanLat = (minLat + maxLat) / 2;

  const spacingM = Math.sqrt(Math.max(hectaresPerPoint, 0.1) * 10000);
  const latStep = spacingM / 111320;
  const lngStep = spacingM / (111320 * Math.cos((meanLat * Math.PI) / 180));

  const points = [];
  for (let lat = minLat + latStep / 2; lat <= maxLat; lat += latStep) {
    for (let lng = minLng + lngStep / 2; lng <= maxLng; lng += lngStep) {
      if (pointInPolygon(lat, lng, polygon)) {
        points.push({ id: uid(), lat, lng, label: `P${points.length + 1}` });
      }
    }
  }
  return points;
}

function haversineMeters(lat1, lng1, lat2, lng2) {
  const R = 6371000;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function SoilAnalysisModal({ data, field, readOnly, onSave, onClose }) {
  const [form, setForm] = useState({
    id: data?.id || uid(), fieldId: field.id, date: new Date().toISOString().slice(0, 10),
    label: "", points: [],
    ...(data || {}),
  });
  const [selectedPointId, setSelectedPointId] = useState(form.points[0]?.id || null);
  const [nutrient, setNutrient] = useState("p");
  const [gridHectares, setGridHectares] = useState(5);
  const [gridError, setGridError] = useState("");
  const [gpsActive, setGpsActive] = useState(false);
  const [liveLocation, setLiveLocation] = useState(null);
  const [gpsError, setGpsError] = useState("");
  const [fullscreen, setFullscreen] = useState(false);
  const watchIdRef = useRef(null);

  const polygon = field.fieldMap?.mode === "kml" ? field.fieldMap.points : [];
  const bounds = polygon.length >= 3 ? polygon.map(([lat, lng]) => [lat, lng]) : null;

  useEffect(() => {
    return () => { if (watchIdRef.current !== null) navigator.geolocation.clearWatch(watchIdRef.current); };
  }, []);

  function toggleGps() {
    if (gpsActive) {
      if (watchIdRef.current !== null) navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
      setGpsActive(false);
      setLiveLocation(null);
      return;
    }
    if (!navigator.geolocation) {
      setGpsError("Esse navegador/dispositivo não tem suporte a GPS.");
      return;
    }
    setGpsError("");
    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => setLiveLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      (err) => setGpsError(err.message || "Não foi possível obter sua localização. Confira se o navegador tem permissão de GPS."),
      { enableHighAccuracy: true, maximumAge: 2000, timeout: 15000 }
    );
    setGpsActive(true);
  }

  const sortedPoints = useMemo(() => {
    if (!liveLocation) return form.points;
    return [...form.points].sort(
      (a, b) => haversineMeters(liveLocation.lat, liveLocation.lng, a.lat, a.lng) - haversineMeters(liveLocation.lat, liveLocation.lng, b.lat, b.lng)
    );
  }, [form.points, liveLocation]);

  function handleMapClick(lat, lng) {
    if (readOnly) return;
    const label = `P${form.points.length + 1}`;
    const point = { id: uid(), lat, lng, label };
    setForm((f) => ({ ...f, points: [...f.points, point] }));
    setSelectedPointId(point.id);
  }

  function handleGenerateGrid() {
    setGridError("");
    if (!bounds) return;
    if (form.points.length > 0 && !confirm(`Isso substitui os ${form.points.length} ponto(s) já existentes (e qualquer resultado já preenchido). Continuar?`)) {
      return;
    }
    const generated = generateSamplingGrid(polygon, Number(gridHectares) || 5);
    if (generated.length === 0) {
      setGridError("Nenhum ponto coube dentro do talhão com esse espaçamento. Tente um valor menor.");
      return;
    }
    if (generated.length > 500) {
      setGridError(`Isso geraria ${generated.length} pontos — tente um espaçamento maior (menos denso).`);
      return;
    }
    setForm((f) => ({ ...f, points: generated }));
    setSelectedPointId(null);
  }

  function updateSelectedPoint(patch) {
    setForm((f) => ({ ...f, points: f.points.map((p) => (p.id === selectedPointId ? { ...p, ...patch } : p)) }));
  }

  function deletePoint(id) {
    setForm((f) => ({ ...f, points: f.points.filter((p) => p.id !== id) }));
    if (selectedPointId === id) setSelectedPointId(null);
  }

  const selectedPoint = form.points.find((p) => p.id === selectedPointId);
  const heatOverlay = useMemo(() => buildHeatOverlay(polygon, form.points, nutrient), [polygon, form.points, nutrient]);
  const canSave = !readOnly && form.date && form.points.length >= 3;

  const mapEl = bounds && (
    <MapContainer bounds={bounds} boundsOptions={{ padding: [16, 16] }} style={{ height: "100%", width: "100%" }} scrollWheelZoom>
      <TileLayer
        attribution="Tiles &copy; Esri — Source: Esri, Maxar, Earthstar Geographics"
        url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
        maxZoom={19}
      />
      <Polygon positions={bounds} pathOptions={{ color: "#7BC142", weight: 1.5, fillOpacity: 0 }} />
      {heatOverlay && <ImageOverlay url={heatOverlay.dataUrl} bounds={heatOverlay.bounds} opacity={0.65} />}
      {!readOnly && <MapClickCapture onClick={handleMapClick} />}
      {form.points.map((p) => (
        <CircleMarker
          key={p.id}
          center={[p.lat, p.lng]}
          radius={selectedPointId === p.id ? 10 : 7}
          pathOptions={{
            color: "#0E1310", weight: selectedPointId === p.id ? 2.5 : 1.5,
            fillColor: p[nutrient] !== undefined && p[nutrient] !== "" ? "#F2F0E6" : "#9BA298",
            fillOpacity: 0.9,
          }}
          eventHandlers={{ click: () => setSelectedPointId(p.id) }}
        >
          <Tooltip permanent direction="top" offset={[0, -9]} className="field-map-label">{p.label}</Tooltip>
        </CircleMarker>
      ))}
      {liveLocation && (
        <CircleMarker
          center={[liveLocation.lat, liveLocation.lng]}
          radius={8}
          pathOptions={{ color: "#F5F2E8", weight: 2, fillColor: "#2E86FF", fillOpacity: 0.9 }}
        >
          <Tooltip direction="top" permanent>Você está aqui</Tooltip>
        </CircleMarker>
      )}
    </MapContainer>
  );

  const controlsEl = (
    <>
      <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 12, flexWrap: "wrap" }}>
        <span style={{ fontSize: 9.5, color: "#9BA298" }}>Ver no mapa:</span>
        <select style={{ ...inputStyle, width: 220 }} value={nutrient} onChange={(e) => setNutrient(e.target.value)}>
          {SOIL_NUTRIENTS.map((n) => <option key={n.key} value={n.key}>{n.label}</option>)}
        </select>
        {!readOnly && (
          <GhostBtn onClick={toggleGps}>
            <MapPin size={14} /> {gpsActive ? "Desativar GPS ao vivo" : "Ativar GPS ao vivo"}
          </GhostBtn>
        )}
        {gpsError && <span style={{ fontSize: 9.5, color: "#E38B84" }}>{gpsError}</span>}
      </div>
      {gpsActive && (
        <div style={{ fontSize: 9.5, color: "#6B7268", marginBottom: 8 }}>
          {liveLocation ? "Pontos ordenados do mais perto pro mais longe da sua posição atual." : "Localizando…"}
        </div>
      )}

      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 14 }}>
        {sortedPoints.map((p) => {
          const dist = liveLocation ? Math.round(haversineMeters(liveLocation.lat, liveLocation.lng, p.lat, p.lng)) : null;
          return (
            <button key={p.id} onClick={() => setSelectedPointId(p.id)} style={{
              display: "flex", alignItems: "center", gap: 5, padding: "5px 10px", borderRadius: 16,
              border: "1px solid " + (selectedPointId === p.id ? "#3E7A3F" : "#232B25"),
              background: selectedPointId === p.id ? "#1E4A20" : "#161D19",
              color: selectedPointId === p.id ? "#F5F2E8" : "#D6D3C7", fontSize: 10, cursor: "pointer",
            }}>
              {p.label}{dist !== null ? ` · ${dist}m` : ""}
              {!readOnly && (
                <X size={11} onClick={(e) => { e.stopPropagation(); deletePoint(p.id); }} />
              )}
            </button>
          );
        })}
        {form.points.length === 0 && <span style={{ fontSize: 10, color: "#6B7268" }}>Nenhum ponto ainda.</span>}
      </div>

      {selectedPoint && (
        <div style={{ background: "#10140F", border: "1px solid #212922", borderRadius: 8, padding: 14, marginBottom: 14 }}>
          <div style={{ fontSize: 10.5, fontWeight: 600, color: "#D6D3C7", marginBottom: 10 }}>Resultado — {selectedPoint.label}</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(120px, 1fr))", gap: 10 }}>
            {SOIL_NUTRIENTS.map((n) => (
              <div key={n.key}>
                <div style={{ fontSize: 9, color: "#6B7268", marginBottom: 3 }}>{n.label}{n.unit ? ` (${n.unit})` : ""}</div>
                {readOnly ? (
                  <div style={{ fontSize: 11, color: "#D6D3C7" }}>{selectedPoint[n.key] ?? "—"}</div>
                ) : (
                  <input
                    type="number" style={inputStyle}
                    value={selectedPoint[n.key] ?? ""}
                    onChange={(e) => updateSelectedPoint({ [n.key]: e.target.value === "" ? "" : Number(e.target.value) })}
                  />
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );

  if (fullscreen && bounds) {
    return (
      <div style={{ position: "fixed", inset: 0, zIndex: 300, background: "#0E1310", display: "flex", flexDirection: "column" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 16px", borderBottom: "1px solid #232B25", flexShrink: 0, gap: 8, flexWrap: "wrap" }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: "#F2F0E6" }}>{form.label || fmtDate(form.date)}</div>
          <div style={{ display: "flex", gap: 8 }}>
            {!readOnly && <PrimaryBtn onClick={() => canSave && onSave(form)} disabled={!canSave}>Salvar</PrimaryBtn>}
            <GhostBtn onClick={() => setFullscreen(false)}><X size={14} /> Sair da tela cheia</GhostBtn>
          </div>
        </div>
        <div style={{ flex: 1, minHeight: 0 }}>{mapEl}</div>
        <div style={{ padding: 14, overflowY: "auto", maxHeight: "42vh", flexShrink: 0, borderTop: "1px solid #232B25" }}>
          {controlsEl}
        </div>
      </div>
    );
  }

  return (
    <Modal title={readOnly ? "Análise de solo" : data?.id ? "Editar análise de solo" : "Nova análise de solo"} onClose={onClose} maxWidth={880}>
      <div style={{ display: "flex", gap: 12, marginBottom: 12, flexWrap: "wrap" }}>
        <div style={{ flex: 1, minWidth: 140 }}>
          <Field label="Data da coleta">
            {readOnly ? (
              <div style={{ fontSize: 11, color: "#D6D3C7", padding: "9px 0" }}>{fmtDate(form.date)}</div>
            ) : (
              <input type="date" style={inputStyle} value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
            )}
          </Field>
        </div>
        <div style={{ flex: 2, minWidth: 200 }}>
          <Field label="Identificação (opcional)">
            {readOnly ? (
              <div style={{ fontSize: 11, color: "#D6D3C7", padding: "9px 0" }}>{form.label || "—"}</div>
            ) : (
              <input style={inputStyle} value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })} placeholder="Ex: Análise pré-plantio safra 25/26" />
            )}
          </Field>
        </div>
      </div>

      {!bounds ? (
        <div style={{ fontSize: 10.5, color: "#E3B455", background: "#332811", borderRadius: 8, padding: 12, marginBottom: 14 }}>
          Esse talhão não tem uma área definida por KML (coordenadas reais) — a amostragem georreferenciada de solo só funciona com um talhão desenhado a partir de KML. Defina a área do talhão nesse formato pra habilitar a coleta.
        </div>
      ) : (
        <>
          {!readOnly && (
            <>
              <div style={{ display: "flex", gap: 10, alignItems: "flex-end", marginBottom: 12, flexWrap: "wrap", background: "#10140F", border: "1px solid #212922", borderRadius: 8, padding: 12 }}>
                <div style={{ width: 170 }}>
                  <Field label="Gerar grade a cada (ha)">
                    <input type="number" min="0.1" step="0.5" style={inputStyle} value={gridHectares} onChange={(e) => setGridHectares(e.target.value)} />
                  </Field>
                </div>
                <GhostBtn onClick={handleGenerateGrid} style={{ marginBottom: 14 }}>Gerar grade automática</GhostBtn>
                {gridError && <div style={{ fontSize: 9.5, color: "#E38B84", width: "100%" }}>{gridError}</div>}
              </div>
              <div style={{ fontSize: 9.5, color: "#6B7268", marginBottom: 8 }}>
                Gere a grade automática acima, ou clique direto no mapa pra adicionar/ajustar pontos manualmente. Selecione um ponto na lista abaixo pra preencher o resultado.
              </div>
            </>
          )}
          <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 8 }}>
            <GhostBtn onClick={() => setFullscreen(true)}>Tela cheia</GhostBtn>
          </div>
          <div style={{ height: 340, borderRadius: 8, overflow: "hidden", border: "1px solid #232B25", marginBottom: 14 }}>
            {mapEl}
          </div>
          {controlsEl}
        </>
      )}

      <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 8 }}>
        <GhostBtn onClick={onClose}>{readOnly ? "Fechar" : "Cancelar"}</GhostBtn>
        {!readOnly && (
          <PrimaryBtn onClick={() => canSave && onSave(form)} disabled={!canSave}>Salvar</PrimaryBtn>
        )}
      </div>
    </Modal>
  );
}

function FieldDetail({ field, soilAnalyses, onBack, onAddHarvest, onEditHarvest, onDeleteHarvest, onOpenHarvest, onAddSoilAnalysis, onEditSoilAnalysis, onDeleteSoilAnalysis }) {
  if (!field) return null;
  const sorted = [...field.harvests].sort((a, b) => {
    if (a.status !== b.status) return a.status === "Em andamento" ? -1 : 1;
    return (b.plantingDate || "").localeCompare(a.plantingDate || "");
  });
  return (
    <div>
      <button onClick={onBack} style={{ background: "none", border: "none", color: "#9BA298", cursor: "pointer", display: "flex", alignItems: "center", gap: 5, fontSize: 10.5, marginBottom: 14, padding: 0 }}>
        <ArrowLeft size={14} /> Voltar
      </button>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 22 }}>
        <div>
          <h2 style={{ fontFamily: "'Manrope', sans-serif", fontSize: 17.5, fontWeight: 800, color: "#F2F0E6", margin: "0 0 6px", display: "flex", alignItems: "center", gap: 7 }}>
            {field.name}
            {field.fieldMap && <MapPin size={14} color="#7BC142" />}
          </h2>
          <div style={{ display: "flex", gap: 16, fontSize: 10.5, color: "#9BA298" }}>
            <span>{field.clientName} · {field.propertyName}</span>
            <span>{fieldAreaHa(field).toLocaleString("pt-BR")} ha</span>
          </div>
        </div>
        <PrimaryBtn onClick={onAddHarvest}><Plus size={16} /> Nova safra</PrimaryBtn>
      </div>

      {sorted.length === 0 ? (
        <EmptyState icon={Wheat} title="Nenhuma safra cadastrada" sub="Registre o primeiro plantio (soja ou milho) deste talhão." />
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 12 }}>
          {sorted.map((h) => (
            <div key={h.id} onClick={() => onOpenHarvest(h.id)} style={{
              background: "#161D19", border: "1px solid " + (h.status === "Em andamento" ? "#3E7A3F" : "#232B25"),
              borderRadius: 12, padding: 16, cursor: "pointer"
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                <div style={{ fontWeight: 600, color: "#F2F0E6", fontSize: 12.5 }}>{h.name}</div>
                <CultureBadge culture={h.culture} />
              </div>
              <div style={{ fontSize: 10, color: "#9BA298", marginBottom: 8 }}>
                {h.variety || "cultivar não informado"}
              </div>
              <div style={{ fontSize: 9.5, color: h.status === "Em andamento" ? "#7BC142" : "#9BA298", fontWeight: 600, marginBottom: 8 }}>
                {h.status}
              </div>
              <div style={{ fontSize: 9.5, color: "#6B7268", lineHeight: 1.6 }}>
                <div>Plantio: {fmtDate(h.plantingDate)}</div>
                {h.status === "Em andamento" && h.estimatedHarvestDate && <div>Colheita estimada: {fmtDate(h.estimatedHarvestDate)}</div>}
                {h.harvestDate && <div>Colhida em: {fmtDate(h.harvestDate)}</div>}
              </div>
              {h.lastVisit && (
                <div style={{ marginTop: 10 }}>
                  <StageProgress culture={h.culture} stage={h.lastVisit.stage} />
                </div>
              )}
              <div style={{ display: "flex", gap: 6, marginTop: 12 }} onClick={(e) => e.stopPropagation()}>
                <button onClick={() => onEditHarvest(h)} style={{ ...iconBtnStyle, flex: 1, display: "flex", justifyContent: "center" }}><Pencil size={13} /></button>
                <button onClick={() => { if (confirm(`Remover a safra ${h.name}?`)) onDeleteHarvest(h.id); }} style={{ ...iconBtnStyle, flex: 1, display: "flex", justifyContent: "center" }}><Trash2 size={13} /></button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 30, marginBottom: 14 }}>
        <h3 style={{ fontFamily: "'Manrope', sans-serif", fontSize: 14, fontWeight: 700, color: "#F2F0E6", margin: 0 }}>Análises de Solo</h3>
        {field.fieldMap?.mode === "kml" && field.fieldMap.points?.length >= 3 && (
          <PrimaryBtn onClick={onAddSoilAnalysis}><Plus size={16} /> Nova análise de solo</PrimaryBtn>
        )}
      </div>
      {field.fieldMap?.mode !== "kml" || !(field.fieldMap.points?.length >= 3) ? (
        <div style={{ fontSize: 10.5, color: "#9BA298", background: "#161D19", border: "1px solid #232B25", borderRadius: 12, padding: 16 }}>
          Amostragem georreferenciada de solo só funciona com um talhão desenhado a partir de KML (coordenadas reais). Defina a área desse talhão nesse formato pra habilitar.
        </div>
      ) : soilAnalyses.length === 0 ? (
        <EmptyState icon={FlaskConical} title="Nenhuma análise de solo registrada" sub="Registre a primeira coleta georreferenciada deste talhão." />
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 12 }}>
          {[...soilAnalyses].sort((a, b) => (b.date || "").localeCompare(a.date || "")).map((s) => (
            <div key={s.id} onClick={() => onEditSoilAnalysis(s)} style={{
              background: "#161D19", border: "1px solid #232B25", borderRadius: 12, padding: 16, cursor: "pointer"
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 6 }}>
                <FlaskConical size={14} color="#7BC142" />
                <div style={{ fontWeight: 600, color: "#F2F0E6", fontSize: 11.5 }}>{s.label || fmtDate(s.date)}</div>
              </div>
              <div style={{ fontSize: 9.5, color: "#9BA298", marginBottom: 10 }}>
                {fmtDate(s.date)} · {s.points.length} ponto(s) coletado(s)
              </div>
              <div style={{ display: "flex", gap: 6 }} onClick={(e) => e.stopPropagation()}>
                <button onClick={() => onEditSoilAnalysis(s)} style={{ ...iconBtnStyle, flex: 1, display: "flex", justifyContent: "center" }}><Pencil size={13} /></button>
                <button onClick={() => { if (confirm(`Remover a análise "${s.label || fmtDate(s.date)}"?`)) onDeleteSoilAnalysis(s.id); }} style={{ ...iconBtnStyle, flex: 1, display: "flex", justifyContent: "center" }}><Trash2 size={13} /></button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function HarvestDetail({ harvest, visits, onBack, onEdit, onAddVisit, onEditVisit, onDeleteVisit }) {
  if (!harvest) return null;
  const sortedVisits = [...visits].sort((a, b) => b.date.localeCompare(a.date));
  return (
    <div>
      <button onClick={onBack} style={{ background: "none", border: "none", color: "#9BA298", cursor: "pointer", display: "flex", alignItems: "center", gap: 5, fontSize: 10.5, marginBottom: 14, padding: 0 }}>
        <ArrowLeft size={14} /> Voltar
      </button>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 18, flexWrap: "wrap", gap: 12 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
            <h2 style={{ fontFamily: "'Manrope', sans-serif", fontSize: 17.5, fontWeight: 800, color: "#F2F0E6", margin: 0 }}>{harvest.name}</h2>
            <CultureBadge culture={harvest.culture} />
          </div>
          <div style={{ fontSize: 10.5, color: "#9BA298" }}>
            {harvest.clientName} · {harvest.propertyName} · {harvest.fieldName}
          </div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <GhostBtn onClick={onEdit}><Pencil size={14} /> Editar safra</GhostBtn>
          <PrimaryBtn onClick={onAddVisit}><Plus size={16} /> Registrar visita</PrimaryBtn>
        </div>
      </div>

      <div style={{ background: "#161D19", border: "1px solid #232B25", borderRadius: 12, padding: 16, marginBottom: 20, display: "flex", gap: 24, flexWrap: "wrap" }}>
        <div>
          <div style={{ fontSize: 9.5, color: "#6B7268", textTransform: "uppercase", marginBottom: 3 }}>Cultivar</div>
          <div style={{ fontSize: 11.5, color: "#D6D3C7" }}>{harvest.variety || "—"}</div>
        </div>
        <div>
          <div style={{ fontSize: 9.5, color: "#6B7268", textTransform: "uppercase", marginBottom: 3 }}>Plantio</div>
          <div style={{ fontSize: 11.5, color: "#D6D3C7" }}>{fmtDate(harvest.plantingDate)}</div>
        </div>
        <div>
          <div style={{ fontSize: 9.5, color: "#6B7268", textTransform: "uppercase", marginBottom: 3 }}>
            {harvest.status === "Em andamento" ? "Colheita estimada" : "Colhida em"}
          </div>
          <div style={{ fontSize: 11.5, color: harvest.status === "Em andamento" ? "#7BC142" : "#D6D3C7" }}>
            {harvest.status === "Em andamento" ? (harvest.estimatedHarvestDate ? fmtDate(harvest.estimatedHarvestDate) : "—") : fmtDate(harvest.harvestDate)}
          </div>
        </div>
        <div>
          <div style={{ fontSize: 9.5, color: "#6B7268", textTransform: "uppercase", marginBottom: 3 }}>Status</div>
          <div style={{ fontSize: 11.5, color: harvest.status === "Em andamento" ? "#7BC142" : "#D6D3C7", fontWeight: 600 }}>{harvest.status}</div>
        </div>
      </div>

      {sortedVisits.length === 0 ? (
        <EmptyState icon={ClipboardList} title="Nenhuma visita registrada" sub="Registre a primeira visita técnica desta safra." />
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {sortedVisits.map((v) => (
            <div key={v.id} style={{ background: "#161D19", border: "1px solid #232B25", borderRadius: 12, padding: 16 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10, marginBottom: 8 }}>
                <div>
                  <div style={{ display: "flex", gap: 12, alignItems: "center", fontSize: 10, color: "#9BA298" }}>
                    <span style={{ display: "flex", alignItems: "center", gap: 4 }}><Calendar size={12} /> {fmtDate(v.date)}</span>
                    <span>Técnico: {v.technician}</span>
                  </div>
                </div>
                <div style={{ display: "flex", gap: 6 }}>
                  <button onClick={() => onEditVisit(v)} style={iconBtnStyle}><Pencil size={14} /></button>
                  <button onClick={() => { if (confirm("Remover esta visita?")) onDeleteVisit(v.id); }} style={iconBtnStyle}><Trash2 size={14} /></button>
                </div>
              </div>
              <div style={{ marginBottom: 10 }}>
                <StageProgress culture={harvest.culture} stage={v.stage} />
              </div>
              {v.pests && (
                <div style={{ fontSize: 10.5, color: "#D6D3C7", marginBottom: 4 }}><strong>Pragas/doenças:</strong> {v.pests}</div>
              )}
              {v.recommendations && (
                <div style={{ fontSize: 10.5, color: "#D6D3C7" }}><strong>Recomendações:</strong> {v.recommendations}</div>
              )}
              {v.photos && v.photos.length > 0 && (
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 10 }}>
                  {v.photos.map((p) => (
                    <a key={p.id} href={p.url} target="_blank" rel="noreferrer">
                      <img src={p.url} alt="" style={{ width: 64, height: 64, objectFit: "cover", borderRadius: 8, border: "1px solid #232B25", display: "block" }} />
                    </a>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function PropriedadesView({ properties, clients, search, setSearch, onAdd, onEdit, onDelete, onOpen, hasClients }) {
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18, gap: 12 }}>
        <h2 style={{ fontFamily: "'Manrope', sans-serif", fontSize: 17.5, fontWeight: 800, color: "#F2F0E6", margin: 0 }}>Propriedades</h2>
        <PrimaryBtn onClick={onAdd} disabled={!hasClients} style={!hasClients ? { opacity: 0.5, cursor: "not-allowed" } : {}}>
          <Plus size={16} /> Nova propriedade
        </PrimaryBtn>
      </div>
      {!hasClients && (
        <div style={{ display: "flex", gap: 8, alignItems: "center", background: "#332811", color: "#E3B455", padding: "10px 14px", borderRadius: 8, fontSize: 10.5, marginBottom: 16 }}>
          <AlertTriangle size={15} /> Cadastre um cliente antes de adicionar propriedades.
        </div>
      )}
      <div style={{ position: "relative", maxWidth: 320, marginBottom: 16 }}>
        <Search size={15} style={{ position: "absolute", left: 10, top: 10, color: "#6B7268" }} />
        <input placeholder="Buscar propriedade ou cliente…" value={search} onChange={(e) => setSearch(e.target.value)}
          style={{ ...inputStyle, paddingLeft: 32 }} />
      </div>
      {properties.length === 0 ? (
        <EmptyState icon={Home} title="Nenhuma propriedade encontrada" sub="Cadastre a primeira propriedade vinculada a um cliente." />
      ) : (
        <div style={{ background: "#161D19", border: "1px solid #232B25", borderRadius: 12, overflow: "hidden" }}>
          <table>
            <thead><tr><th>Propriedade</th><th>Cliente</th><th>Localização</th><th>Talhões</th><th>Área</th><th></th></tr></thead>
            <tbody>
              {properties.map((p) => (
                <tr key={p.id} style={{ cursor: "pointer" }} onClick={() => onOpen(p.id)}>
                  <td style={{ fontWeight: 600, color: "#F2F0E6" }}>{p.name}</td>
                  <td>{p.clientName}</td>
                  <td>{p.location || "—"}</td>
                  <td>{p.fieldCount}</td>
                  <td>{p.areaTotal.toLocaleString("pt-BR")} ha</td>
                  <td onClick={(e) => e.stopPropagation()}>
                    <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
                      <button onClick={() => onEdit(p)} style={iconBtnStyle}><Pencil size={14} /></button>
                      <button onClick={() => { if (confirm(`Remover propriedade ${p.name}?`)) onDelete(p.id); }} style={iconBtnStyle}><Trash2 size={14} /></button>
                      <ChevronRight size={16} color="#6B7268" />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function PropertyDetail({ property, fields, onBack, onAddField, onEditField, onDeleteField, onOpenField }) {
  if (!property) return null;
  return (
    <div>
      <button onClick={onBack} style={{ background: "none", border: "none", color: "#9BA298", cursor: "pointer", display: "flex", alignItems: "center", gap: 5, fontSize: 10.5, marginBottom: 14, padding: 0 }}>
        <ArrowLeft size={14} /> Voltar
      </button>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 22 }}>
        <div>
          <h2 style={{ fontFamily: "'Manrope', sans-serif", fontSize: 17.5, fontWeight: 800, color: "#F2F0E6", margin: "0 0 6px" }}>{property.name}</h2>
          <div style={{ display: "flex", gap: 16, fontSize: 10.5, color: "#9BA298" }}>
            <span>{property.clientName}</span>
            {property.location && <span style={{ display: "flex", alignItems: "center", gap: 5 }}><MapPin size={13} /> {property.location}</span>}
          </div>
        </div>
        <PrimaryBtn onClick={onAddField}><Plus size={16} /> Novo talhão</PrimaryBtn>
      </div>

      {fields.length === 0 ? (
        <EmptyState icon={Sprout} title="Nenhum talhão cadastrado" sub="Adicione as áreas físicas desta propriedade — depois é só lançar as safras de cada uma." />
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 12 }}>
          {fields.map((f) => (
            <div key={f.id} onClick={() => onOpenField(f.id)} style={{ background: "#161D19", border: "1px solid #232B25", borderRadius: 12, padding: 16, cursor: "pointer" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                <div style={{ fontWeight: 600, color: "#F2F0E6", fontSize: 11.5, display: "flex", alignItems: "center", gap: 5 }}>
                  {f.name}
                  {f.fieldMap && <MapPin size={11} color="#7BC142" />}
                </div>
                {f.activeHarvest ? <CultureBadge culture={f.activeHarvest.culture} /> : <ChevronRight size={16} color="#6B7268" />}
              </div>
              <div style={{ fontSize: 10, color: "#9BA298", marginBottom: 10 }}>
                {fieldAreaHa(f).toLocaleString("pt-BR")} ha · {f.harvestCount} safra(s) registrada(s)
              </div>
              {f.activeHarvest ? (
                <StageProgress culture={f.activeHarvest.culture} stage={f.activeHarvest.lastVisit?.stage} />
              ) : (
                <div style={{ fontSize: 9.5, color: "#7BC142", fontWeight: 600, display: "flex", alignItems: "center", gap: 4 }}>
                  <Plus size={11} /> Adicionar safra
                </div>
              )}
              <div style={{ display: "flex", gap: 6, marginTop: 12 }} onClick={(e) => e.stopPropagation()}>
                <button onClick={() => onEditField(f)} style={{ ...iconBtnStyle, flex: 1, display: "flex", justifyContent: "center" }}><Pencil size={13} /></button>
                <button onClick={() => { if (confirm(`Remover talhão ${f.name} e todas as safras/visitas vinculadas?`)) onDeleteField(f.id); }} style={{ ...iconBtnStyle, flex: 1, display: "flex", justifyContent: "center" }}><Trash2 size={13} /></button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function TalhoesView({ fields, cultureFilter, setCultureFilter, onAdd, onEdit, onDelete, onOpen, hasProperties }) {
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18, gap: 12 }}>
        <h2 style={{ fontFamily: "'Manrope', sans-serif", fontSize: 17.5, fontWeight: 800, color: "#F2F0E6", margin: 0 }}>Talhões</h2>
        <PrimaryBtn onClick={onAdd} disabled={!hasProperties} style={!hasProperties ? { opacity: 0.5, cursor: "not-allowed" } : {}}>
          <Plus size={16} /> Novo talhão
        </PrimaryBtn>
      </div>
      {!hasProperties && (
        <div style={{ display: "flex", gap: 8, alignItems: "center", background: "#332811", color: "#E3B455", padding: "10px 14px", borderRadius: 8, fontSize: 10.5, marginBottom: 16 }}>
          <AlertTriangle size={15} /> Cadastre uma propriedade antes de adicionar talhões.
        </div>
      )}
      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        {["Todas", "Soja", "Milho"].map((c) => (
          <button key={c} onClick={() => setCultureFilter(c)} style={{
            padding: "7px 14px", borderRadius: 20, border: "1px solid " + (cultureFilter === c ? "#1E4A20" : "#232B25"),
            background: cultureFilter === c ? "#1E4A20" : "#161D19", color: cultureFilter === c ? "#F5F2E8" : "#D6D3C7",
            fontSize: 10.5, fontWeight: 600, cursor: "pointer"
          }}>{c}</button>
        ))}
      </div>
      {fields.length === 0 ? (
        <EmptyState icon={Sprout} title="Nenhum talhão encontrado" sub="Ajuste o filtro ou cadastre um novo talhão." />
      ) : (
        <div style={{ background: "#161D19", border: "1px solid #232B25", borderRadius: 12, overflow: "hidden" }}>
          <table>
            <thead><tr><th>Talhão</th><th>Propriedade</th><th>Cliente</th><th>Área</th><th>Safra atual</th><th>Estágio</th><th></th></tr></thead>
            <tbody>
              {fields.map((f) => (
                <tr key={f.id} style={{ cursor: "pointer" }} onClick={() => onOpen(f.id)}>
                  <td style={{ fontWeight: 600, color: "#F2F0E6" }}>
                    <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
                      {f.name}
                      {f.fieldMap && <MapPin size={11} color="#7BC142" />}
                    </span>
                  </td>
                  <td>{f.propertyName}</td>
                  <td>{f.clientName}</td>
                  <td>{fieldAreaHa(f).toLocaleString("pt-BR")} ha</td>
                  <td>
                    {f.activeHarvest ? (
                      <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <CultureBadge culture={f.activeHarvest.culture} />
                        <span style={{ fontSize: 9.5, color: "#9BA298" }}>{f.activeHarvest.variety}</span>
                      </span>
                    ) : (
                      <span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 9.5, color: "#7BC142", fontWeight: 600 }}>
                        <Plus size={11} /> Adicionar safra
                      </span>
                    )}
                  </td>
                  <td>{f.activeHarvest ? <StageProgress culture={f.activeHarvest.culture} stage={f.activeHarvest.lastVisit?.stage} /> : <span style={{ color: "#6B7268", fontSize: 9.5 }}>—</span>}</td>
                  <td onClick={(e) => e.stopPropagation()}>
                    <div style={{ display: "flex", gap: 6, justifyContent: "flex-end", alignItems: "center" }}>
                      <button onClick={() => onEdit(f)} style={iconBtnStyle}><Pencil size={14} /></button>
                      <button onClick={() => { if (confirm(`Remover talhão ${f.name}?`)) onDelete(f.id); }} style={iconBtnStyle}><Trash2 size={14} /></button>
                      <ChevronRight size={16} color="#6B7268" />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function VisitasView({ visits, harvests, onAdd, onEdit, onDelete, hasHarvests }) {
  const list = useMemo(() => {
    return [...visits].sort((a, b) => b.date.localeCompare(a.date)).map((v) => {
      const harvest = harvests.find((h) => h.id === v.harvestId);
      return {
        ...v,
        fieldName: harvest ? harvest.fieldName : "(safra removida)",
        culture: harvest ? harvest.culture : null,
        clientName: harvest ? harvest.clientName : "—",
        propertyName: harvest ? harvest.propertyName : "—",
      };
    });
  }, [visits, harvests]);

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18, gap: 12 }}>
        <h2 style={{ fontFamily: "'Manrope', sans-serif", fontSize: 17.5, fontWeight: 800, color: "#F2F0E6", margin: 0 }}>Visitas técnicas</h2>
        <PrimaryBtn onClick={onAdd} disabled={!hasHarvests} style={!hasHarvests ? { opacity: 0.5, cursor: "not-allowed" } : {}}>
          <Plus size={16} /> Registrar visita
        </PrimaryBtn>
      </div>
      {!hasHarvests && (
        <div style={{ display: "flex", gap: 8, alignItems: "center", background: "#332811", color: "#E3B455", padding: "10px 14px", borderRadius: 8, fontSize: 10.5, marginBottom: 16 }}>
          <AlertTriangle size={15} /> Cadastre uma safra antes de registrar visitas.
        </div>
      )}
      {list.length === 0 ? (
        <EmptyState icon={ClipboardList} title="Nenhuma visita registrada" sub="Registre a primeira visita técnica para começar o histórico." />
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {list.map((v) => (
            <div key={v.id} style={{ background: "#161D19", border: "1px solid #232B25", borderRadius: 12, padding: 16 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10, marginBottom: 8 }}>
                <div>
                  <div style={{ fontWeight: 600, color: "#F2F0E6", fontSize: 11.5, marginBottom: 2 }}>
                    {v.clientName} <span style={{ color: "#6B7268", fontWeight: 500 }}>· {v.propertyName} · {v.fieldName}</span>
                  </div>
                  <div style={{ display: "flex", gap: 12, alignItems: "center", fontSize: 10, color: "#9BA298" }}>
                    <span style={{ display: "flex", alignItems: "center", gap: 4 }}><Calendar size={12} /> {fmtDate(v.date)}</span>
                    <span>Técnico: {v.technician}</span>
                  </div>
                </div>
                <div style={{ display: "flex", gap: 6 }}>
                  <button onClick={() => onEdit(v)} style={iconBtnStyle}><Pencil size={14} /></button>
                  <button onClick={() => { if (confirm("Remover esta visita?")) onDelete(v.id); }} style={iconBtnStyle}><Trash2 size={14} /></button>
                </div>
              </div>
              {v.culture && (
                <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 10 }}>
                  <CultureBadge culture={v.culture} />
                  <StageProgress culture={v.culture} stage={v.stage} />
                </div>
              )}
              {v.pests && (
                <div style={{ fontSize: 10.5, color: "#D6D3C7", marginBottom: 4 }}><strong>Pragas/doenças:</strong> {v.pests}</div>
              )}
              {v.recommendations && (
                <div style={{ fontSize: 10.5, color: "#D6D3C7" }}><strong>Recomendações:</strong> {v.recommendations}</div>
              )}
              {v.photos && v.photos.length > 0 && (
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 10 }}>
                  {v.photos.map((p) => (
                    <a key={p.id} href={p.url} target="_blank" rel="noreferrer">
                      <img src={p.url} alt="" style={{ width: 64, height: 64, objectFit: "cover", borderRadius: 8, border: "1px solid #232B25", display: "block" }} />
                    </a>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function SoilAnalysesView({ soilAnalyses, fields, onAdd, onEdit, onDelete }) {
  const eligibleFields = useMemo(
    () => fields.filter((f) => f.fieldMap?.mode === "kml" && f.fieldMap.points?.length >= 3),
    [fields]
  );
  const [selectedFieldId, setSelectedFieldId] = useState(eligibleFields[0]?.id || "");

  const list = useMemo(() => {
    return [...soilAnalyses].sort((a, b) => (b.date || "").localeCompare(a.date || "")).map((s) => {
      const field = fields.find((f) => f.id === s.fieldId);
      return {
        ...s,
        fieldName: field?.name || "(talhão removido)",
        propertyName: field?.propertyName || "—",
        clientName: field?.clientName || "—",
      };
    });
  }, [soilAnalyses, fields]);

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18, gap: 12, flexWrap: "wrap" }}>
        <div>
          <h2 style={{ fontFamily: "'Manrope', sans-serif", fontSize: 17.5, fontWeight: 800, color: "#F2F0E6", margin: "0 0 4px" }}>Análise de Solo</h2>
          <p style={{ color: "#9BA298", fontSize: 10.5, margin: 0 }}>Amostragem georreferenciada por talhão</p>
        </div>
        {eligibleFields.length > 0 && (
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <select style={{ ...inputStyle, width: 260 }} value={selectedFieldId} onChange={(e) => setSelectedFieldId(e.target.value)}>
              {eligibleFields.map((f) => <option key={f.id} value={f.id}>{f.clientName} · {f.propertyName} · {f.name}</option>)}
            </select>
            <PrimaryBtn onClick={() => onAdd(selectedFieldId)}><Plus size={16} /> Nova análise</PrimaryBtn>
          </div>
        )}
      </div>

      {eligibleFields.length === 0 && (
        <div style={{ display: "flex", gap: 8, alignItems: "center", background: "#332811", color: "#E3B455", padding: "10px 14px", borderRadius: 8, fontSize: 10.5, marginBottom: 16 }}>
          <AlertTriangle size={15} /> Nenhum talhão com área definida por KML ainda — defina a área de um talhão nesse formato pra habilitar a amostragem de solo nele.
        </div>
      )}

      {list.length === 0 ? (
        <EmptyState icon={FlaskConical} title="Nenhuma análise de solo registrada" sub="Escolha um talhão acima e registre a primeira coleta georreferenciada." />
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 12 }}>
          {list.map((s) => (
            <div key={s.id} onClick={() => onEdit(s)} style={{ background: "#161D19", border: "1px solid #232B25", borderRadius: 12, padding: 16, cursor: "pointer" }}>
              <div style={{ fontWeight: 600, color: "#F2F0E6", fontSize: 11, marginBottom: 8 }}>
                {s.clientName} <span style={{ color: "#6B7268", fontWeight: 500 }}>· {s.propertyName} · {s.fieldName}</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 6 }}>
                <FlaskConical size={13} color="#7BC142" />
                <span style={{ fontSize: 10.5, color: "#D6D3C7", fontWeight: 600 }}>{s.label || fmtDate(s.date)}</span>
              </div>
              <div style={{ fontSize: 9.5, color: "#9BA298", marginBottom: 10 }}>{fmtDate(s.date)} · {s.points.length} ponto(s) coletado(s)</div>
              <div style={{ display: "flex", gap: 6 }} onClick={(e) => e.stopPropagation()}>
                <button onClick={() => onEdit(s)} style={{ ...iconBtnStyle, flex: 1, display: "flex", justifyContent: "center" }}><Pencil size={13} /></button>
                <button onClick={() => { if (confirm(`Remover a análise "${s.label || fmtDate(s.date)}"?`)) onDelete(s.id); }} style={{ ...iconBtnStyle, flex: 1, display: "flex", justifyContent: "center" }}><Trash2 size={13} /></button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const TASK_TYPE_META = {
  visita: { label: "Visita", bg: "#16301A", color: "#7BC142" },
  tarefa: { label: "Tarefa", bg: "#1A2333", color: "#7EA6E0" },
};

function TaskTypeBadge({ type }) {
  const meta = TASK_TYPE_META[type] || TASK_TYPE_META.tarefa;
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", padding: "2px 8px",
      borderRadius: 20, background: meta.bg, color: meta.color, fontSize: 9, fontWeight: 600, whiteSpace: "nowrap"
    }}>
      {meta.label}
    </span>
  );
}

function AgendaView({ tasks, team, teamAvatars, clients, onAdd, onEdit, onDelete, onToggleDone }) {
  const [weekStart, setWeekStart] = useState(() => startOfWeekMonday(new Date()));
  const [assigneeFilter, setAssigneeFilter] = useState("Todos");

  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const todayIso = toISODateLocal(new Date());
  const weekdayLabels = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];

  const filteredTasks = tasks.filter((t) => assigneeFilter === "Todos" || t.assigneeId === assigneeFilter);
  const tasksByDay = {};
  for (const d of days) tasksByDay[toISODateLocal(d)] = [];
  for (const t of filteredTasks) {
    if (tasksByDay[t.date]) tasksByDay[t.date].push(t);
  }
  for (const iso in tasksByDay) {
    tasksByDay[iso].sort((a, b) => Number(a.done) - Number(b.done));
  }

  const rangeLabel = `${days[0].toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })} – ${days[6].toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })}`;

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18, gap: 12, flexWrap: "wrap" }}>
        <div>
          <h2 style={{ fontFamily: "'Manrope', sans-serif", fontSize: 17.5, fontWeight: 800, color: "#F2F0E6", margin: "0 0 4px" }}>Agenda</h2>
          <p style={{ color: "#9BA298", fontSize: 10.5, margin: 0 }}>Visitas e tarefas da semana · {rangeLabel}</p>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <select style={{ ...inputStyle, width: 170 }} value={assigneeFilter} onChange={(e) => setAssigneeFilter(e.target.value)}>
            <option value="Todos">Toda a equipe</option>
            {team.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
          <GhostBtn onClick={() => setWeekStart(startOfWeekMonday(new Date()))}>Hoje</GhostBtn>
          <GhostBtn onClick={() => setWeekStart(addDays(weekStart, -7))}><ArrowLeft size={14} /></GhostBtn>
          <GhostBtn onClick={() => setWeekStart(addDays(weekStart, 7))}><ChevronRight size={16} /></GhostBtn>
          <PrimaryBtn onClick={() => onAdd(null)}><Plus size={16} /> Nova tarefa</PrimaryBtn>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, minmax(160px, 1fr))", gap: 10, overflowX: "auto", paddingBottom: 4 }}>
        {days.map((d, i) => {
          const iso = toISODateLocal(d);
          const isToday = iso === todayIso;
          const dayTasks = tasksByDay[iso] || [];
          return (
            <div key={iso} style={{
              background: "#161D19", border: "1px solid " + (isToday ? "#7BC142" : "#232B25"), borderRadius: 12, padding: 12,
              display: "flex", flexDirection: "column", gap: 8, minHeight: 160
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <div style={{ fontSize: 9.5, color: isToday ? "#7BC142" : "#6B7268", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".03em" }}>{weekdayLabels[i]}</div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "#F2F0E6", fontFamily: "'Manrope', sans-serif" }}>{d.getDate()}</div>
                </div>
                <button onClick={() => onAdd(iso)} style={iconBtnStyle}><Plus size={13} /></button>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6, flex: 1 }}>
                {dayTasks.length === 0 ? (
                  <div style={{ fontSize: 9.5, color: "#4A5049" }}>—</div>
                ) : (
                  dayTasks.map((t) => {
                    const assignee = team.find((tm) => tm.id === t.assigneeId);
                    const client = clients.find((c) => c.id === t.clientId);
                    return (
                      <div key={t.id} style={{ background: "#10140F", border: "1px solid #212922", borderRadius: 8, padding: 8 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 6, marginBottom: 4 }}>
                          <TaskTypeBadge type={t.type} />
                          <div style={{ display: "flex", gap: 3 }}>
                            <button onClick={() => onEdit(t)} style={{ ...iconBtnStyle, padding: 3 }}><Pencil size={11} /></button>
                            <button onClick={() => { if (confirm("Remover este item da agenda?")) onDelete(t.id); }} style={{ ...iconBtnStyle, padding: 3 }}><Trash2 size={11} /></button>
                          </div>
                        </div>
                        <div
                          onClick={() => onToggleDone(t.id)}
                          style={{
                            fontSize: 10.5, fontWeight: 600, color: t.done ? "#6B7268" : "#D6D3C7",
                            textDecoration: t.done ? "line-through" : "none", cursor: "pointer", marginBottom: 4
                          }}
                        >
                          {t.title}
                        </div>
                        {client && <div style={{ fontSize: 9.5, color: "#9BA298", marginBottom: 4 }}>{client.name}</div>}
                        {assignee && (
                          <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                            <Avatar name={assignee.name} url={teamAvatars?.[assignee.id]} size={16} />
                            <span style={{ fontSize: 9.5, color: "#9BA298" }}>{assignee.name}</span>
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function TaskModal({ data, team, clients, onSave, onClose }) {
  const [form, setForm] = useState({
    type: "visita", title: "", assigneeId: team[0]?.id || "", clientId: "",
    date: toISODateLocal(new Date()), notes: "", done: false,
    ...(data || {}),
  });
  const canSave = form.title.trim() && form.assigneeId && form.date;
  return (
    <Modal title={data?.id ? "Editar item da agenda" : "Novo item na agenda"} onClose={onClose}>
      <Field label="Tipo">
        <select style={inputStyle} value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
          <option value="visita">Visita</option>
          <option value="tarefa">Tarefa</option>
        </select>
      </Field>
      <Field label="Título">
        <input style={inputStyle} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Ex: Visita técnica — monitoramento de pragas" />
      </Field>
      <Field label="Responsável">
        {team.length === 0 ? (
          <div style={{ fontSize: 10.5, color: "#6B7268", padding: "8px 0" }}>Nenhum colaborador cadastrado ainda. Cadastre em Equipe.</div>
        ) : (
          <select style={inputStyle} value={form.assigneeId} onChange={(e) => setForm({ ...form, assigneeId: e.target.value })}>
            <option value="">Selecione…</option>
            {team.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
        )}
      </Field>
      <Field label="Cliente (opcional)">
        <select style={inputStyle} value={form.clientId || ""} onChange={(e) => setForm({ ...form, clientId: e.target.value })}>
          <option value="">Sem cliente vinculado</option>
          {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </Field>
      <Field label="Data">
        <input type="date" style={inputStyle} value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
      </Field>
      <Field label="Observações">
        <textarea style={{ ...inputStyle, minHeight: 60, resize: "vertical" }} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Detalhes, pauta, contexto…" />
      </Field>
      <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 8 }}>
        <GhostBtn onClick={onClose}>Cancelar</GhostBtn>
        <PrimaryBtn onClick={() => canSave && onSave(form)}>Salvar</PrimaryBtn>
      </div>
    </Modal>
  );
}

function ClientModal({ data, team, onSave, onClose }) {
  const [form, setForm] = useState(data || { name: "", phone: "", city: "", gestorId: "" });
  return (
    <Modal title={data ? "Editar cliente" : "Novo cliente"} onClose={onClose}>
      <Field label="Nome do produtor">
        <input style={inputStyle} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Ex: João da Silva" />
      </Field>
      <Field label="Telefone">
        <input style={inputStyle} value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="(00) 00000-0000" />
      </Field>
      <Field label="Cidade / região">
        <input style={inputStyle} value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} placeholder="Ex: São Gabriel do Oeste, MS" />
      </Field>
      <Field label="Gestor responsável">
        {team.length === 0 ? (
          <div style={{ fontSize: 10.5, color: "#6B7268", padding: "8px 0" }}>
            Nenhum colaborador cadastrado ainda. Cadastre em Equipe.
          </div>
        ) : (
          <select style={inputStyle} value={form.gestorId || ""} onChange={(e) => setForm({ ...form, gestorId: e.target.value })}>
            <option value="">Sem gestor definido</option>
            {team.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
        )}
      </Field>
      <div style={{ fontSize: 10, color: "#6B7268", marginTop: -6, marginBottom: 8 }}>
        O gestor é responsável pelo acompanhamento deste cliente, com visita semanal esperada.
      </div>
      <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 8 }}>
        <GhostBtn onClick={onClose}>Cancelar</GhostBtn>
        <PrimaryBtn onClick={() => form.name.trim() && onSave(form)}>Salvar</PrimaryBtn>
      </div>
    </Modal>
  );
}

function PropertyModal({ data, clients, onSave, onClose }) {
  const [form, setForm] = useState({ clientId: clients[0]?.id || "", name: "", location: "", totalArea: "", ...(data || {}) });
  return (
    <Modal title={data?.id ? "Editar propriedade" : "Nova propriedade"} onClose={onClose}>
      <Field label="Cliente">
        <select style={inputStyle} value={form.clientId} onChange={(e) => setForm({ ...form, clientId: e.target.value })}>
          <option value="">Selecione…</option>
          {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </Field>
      <Field label="Nome da propriedade">
        <input style={inputStyle} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Ex: Fazenda Boa Esperança" />
      </Field>
      <Field label="Localização / município">
        <input style={inputStyle} value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} placeholder="Ex: São Gabriel do Oeste, MS" />
      </Field>
      <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 8 }}>
        <GhostBtn onClick={onClose}>Cancelar</GhostBtn>
        <PrimaryBtn onClick={() => form.name.trim() && form.clientId && onSave(form)}>Salvar</PrimaryBtn>
      </div>
    </Modal>
  );
}

function FieldModal({ data, properties, clients, onSave, onClose }) {
  const [form, setForm] = useState({
    propertyId: properties[0]?.id || "", name: "", area: "", fieldMap: null,
    ...(data || {}),
    area: data?.area || (data?.fieldMap?.areaHa ? data.fieldMap.areaHa.toFixed(2) : ""),
  });
  const [showMap, setShowMap] = useState(false);
  return (
    <Modal title={data?.id ? "Editar talhão" : "Novo talhão"} onClose={onClose}>
      <Field label="Propriedade">
        <select style={inputStyle} value={form.propertyId} onChange={(e) => setForm({ ...form, propertyId: e.target.value })}>
          <option value="">Selecione…</option>
          {properties.map((p) => {
            const client = clients.find((c) => c.id === p.clientId);
            return <option key={p.id} value={p.id}>{client?.name} · {p.name}</option>;
          })}
        </select>
      </Field>
      <Field label="Nome do talhão">
        <input style={inputStyle} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Ex: Talhão 3 - Fundos" />
      </Field>
      <Field label="Área (hectares)">
        <input type="number" style={inputStyle} value={form.area} onChange={(e) => setForm({ ...form, area: e.target.value })} placeholder="Ex: 45" />
      </Field>
      <Field label="Localização do talhão">
        <GhostBtn type="button" onClick={() => setShowMap(true)} style={{ width: "100%", justifyContent: "center" }}>
          <MapPin size={14} /> {form.fieldMap ? "Editar área do talhão" : "Definir área (imagem ou KML)"}
        </GhostBtn>
        {form.fieldMap && (
          <div style={{ fontSize: 10.5, color: "#7BC142", marginTop: 6 }}>
            Polígono salvo · {form.fieldMap.points.length} pontos{form.fieldMap.areaHa ? ` · ${form.fieldMap.areaHa.toFixed(2)} ha` : ""}
          </div>
        )}
      </Field>
      <div style={{ fontSize: 10, color: "#6B7268", marginTop: -6, marginBottom: 8 }}>
        Cultura, cultivar e data de plantio agora ficam na Safra — cadastre a primeira safra assim que salvar o talhão.
      </div>
      <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 8 }}>
        <GhostBtn onClick={onClose}>Cancelar</GhostBtn>
        <PrimaryBtn onClick={() => form.name.trim() && form.propertyId && onSave(form)}>Salvar</PrimaryBtn>
      </div>
      {showMap && (
        <FieldMapModal
          initialData={form.fieldMap}
          onSave={(mapData) => {
            setForm({ ...form, fieldMap: mapData, area: mapData.areaHa ? mapData.areaHa.toFixed(2) : form.area });
            setShowMap(false);
          }}
          onClose={() => setShowMap(false)}
        />
      )}
    </Modal>
  );
}

function suggestSeasonName(plantingDate) {
  if (!plantingDate) return "";
  const d = new Date(plantingDate + "T00:00:00");
  const year = d.getFullYear();
  const month = d.getMonth() + 1;
  if (month >= 7) return `${year}/${year + 1}`;
  return `${year - 1}/${year}`;
}

function currentSeasonStartYear() {
  const now = new Date();
  const month = now.getMonth() + 1;
  return month >= 7 ? now.getFullYear() : now.getFullYear() - 1;
}

function generateSeasonOptions() {
  const current = currentSeasonStartYear();
  const options = [];
  for (let startYear = current - 2; startYear <= current + 4; startYear++) {
    options.push({
      value: `${startYear}/${startYear + 1}`,
      isCurrent: startYear === current,
    });
  }
  return options;
}

function HarvestModal({ data, fields, properties, clients, varieties, onSave, onClose }) {
  const [form, setForm] = useState({
    fieldId: fields[0]?.id || "",
    culture: "Soja",
    variety: "",
    plantingDate: "",
    harvestDate: "",
    name: "",
    ...(data || {}),
  });
  const [nameEdited, setNameEdited] = useState(!!data?.name);
  const cultureVarieties = varieties.filter((v) => v.culture === form.culture);
  const selectedVariety = varieties.find((v) => v.name === form.variety && v.culture === form.culture);
  const estimatedHarvest =
    form.plantingDate && selectedVariety?.cycle
      ? new Date(new Date(form.plantingDate + "T00:00:00").getTime() + Number(selectedVariety.cycle) * 86400000)
          .toISOString()
          .slice(0, 10)
      : null;
  const seasonOptions = generateSeasonOptions();
  const hasCustomName = form.name && !seasonOptions.some((s) => s.value === form.name);

  function handlePlantingDateChange(value) {
    const next = { ...form, plantingDate: value };
    if (!nameEdited) next.name = suggestSeasonName(value);
    setForm(next);
  }

  return (
    <Modal title={data?.id ? "Editar safra" : "Nova safra"} onClose={onClose}>
      <Field label="Talhão">
        <select style={inputStyle} value={form.fieldId} onChange={(e) => setForm({ ...form, fieldId: e.target.value })}>
          <option value="">Selecione…</option>
          {fields.map((f) => {
            const property = properties.find((p) => p.id === f.propertyId);
            const client = property ? clients.find((c) => c.id === property.clientId) : null;
            return <option key={f.id} value={f.id}>{client?.name} · {property?.name} · {f.name}</option>;
          })}
        </select>
      </Field>
      <Field label="Safra (ciclo)">
        <select
          style={inputStyle}
          value={form.name}
          onChange={(e) => { setNameEdited(true); setForm({ ...form, name: e.target.value }); }}
        >
          <option value="">Selecione…</option>
          {hasCustomName && <option value={form.name}>{form.name}</option>}
          {seasonOptions.map((s) => (
            <option key={s.value} value={s.value}>{s.value}{s.isCurrent ? " (atual)" : ""}</option>
          ))}
        </select>
      </Field>
      <Field label="Cultura">
        <select style={inputStyle} value={form.culture} onChange={(e) => setForm({ ...form, culture: e.target.value, variety: "" })}>
          <option value="Soja">Soja</option>
          <option value="Milho">Milho</option>
        </select>
      </Field>
      <Field label="Cultivar / híbrido">
        {cultureVarieties.length === 0 ? (
          <div style={{ fontSize: 10, color: "#6B7268", padding: "8px 0" }}>
            Nenhum cultivar de {form.culture} cadastrado ainda. Cadastre em Configurações → Cultivares.
          </div>
        ) : (
          <select style={inputStyle} value={form.variety} onChange={(e) => setForm({ ...form, variety: e.target.value })}>
            <option value="">Selecione…</option>
            {cultureVarieties.map((v) => <option key={v.id} value={v.name}>{v.name}{v.cycle ? ` (${v.cycle}d)` : ""}</option>)}
          </select>
        )}
      </Field>
      <Field label="Data de plantio">
        <input type="date" style={inputStyle} value={form.plantingDate} onChange={(e) => handlePlantingDateChange(e.target.value)} />
      </Field>
      {estimatedHarvest && (
        <div style={{ fontSize: 10.5, color: "#7BC142", marginTop: -8, marginBottom: 14 }}>
          Colheita estimada: {fmtDate(estimatedHarvest)} (ciclo de {selectedVariety.cycle} dias)
        </div>
      )}
      <Field label="Data de colheita (preencha ao colher)">
        <input type="date" style={inputStyle} value={form.harvestDate} onChange={(e) => setForm({ ...form, harvestDate: e.target.value })} />
      </Field>
      <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 8 }}>
        <GhostBtn onClick={onClose}>Cancelar</GhostBtn>
        <PrimaryBtn onClick={() => form.fieldId && form.plantingDate && onSave({ ...form, name: form.name || suggestSeasonName(form.plantingDate) })}>Salvar</PrimaryBtn>
      </div>
    </Modal>
  );
}

function VisitModal({ data, harvests, team, onSave, onUploadPhoto, onDeletePhoto, onClose }) {
  const [form, setForm] = useState({
    id: data?.id || uid(), harvestId: harvests[0]?.id || "", date: new Date().toISOString().slice(0, 10),
    technician: "", stage: "", pests: "", recommendations: "", photos: [],
    ...(data || {}),
  });
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [photoError, setPhotoError] = useState("");
  const selectedHarvest = harvests.find((h) => h.id === form.harvestId);
  const stages = selectedHarvest ? CULTURE_META[selectedHarvest.culture]?.stages || [] : [];

  async function handlePhotoFiles(files) {
    setPhotoError("");
    setUploadingPhoto(true);
    for (const file of files) {
      const r = await onUploadPhoto(form.id, file);
      if (r?.error) { setPhotoError(r.error); continue; }
      setForm((f) => ({ ...f, photos: [...(f.photos || []), r.photo] }));
    }
    setUploadingPhoto(false);
  }

  async function handleDeletePhoto(photo) {
    await onDeletePhoto(form.id, photo);
    setForm((f) => ({ ...f, photos: (f.photos || []).filter((p) => p.id !== photo.id) }));
  }

  return (
    <Modal title={data?.id ? "Editar visita" : "Registrar visita"} onClose={onClose}>
      <Field label="Safra">
        <select style={inputStyle} value={form.harvestId} onChange={(e) => setForm({ ...form, harvestId: e.target.value, stage: "" })}>
          <option value="">Selecione…</option>
          {harvests.map((h) => (
            <option key={h.id} value={h.id}>{h.clientName} · {h.propertyName} · {h.fieldName} · {h.name} ({h.culture})</option>
          ))}
        </select>
      </Field>
      <Field label="Data da visita">
        <input type="date" style={inputStyle} value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
      </Field>
      <Field label="Técnico responsável">
        {team.length === 0 ? (
          <div style={{ fontSize: 10.5, color: "#6B7268", padding: "8px 0" }}>
            Nenhum colaborador cadastrado ainda. Cadastre em Equipe.
          </div>
        ) : (
          <select style={inputStyle} value={form.technician} onChange={(e) => setForm({ ...form, technician: e.target.value })}>
            <option value="">Selecione…</option>
            {team.map((t) => <option key={t.id} value={t.name}>{t.name}</option>)}
          </select>
        )}
      </Field>
      <Field label="Estágio fenológico">
        <select style={inputStyle} value={form.stage} onChange={(e) => setForm({ ...form, stage: e.target.value })} disabled={!selectedHarvest}>
          <option value="">Selecione…</option>
          {stages.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      </Field>
      <Field label="Pragas / doenças observadas">
        <textarea style={{ ...inputStyle, minHeight: 60, resize: "vertical" }} value={form.pests} onChange={(e) => setForm({ ...form, pests: e.target.value })} placeholder="Ex: lagarta-do-cartucho em baixa intensidade" />
      </Field>
      <Field label="Recomendações">
        <textarea style={{ ...inputStyle, minHeight: 60, resize: "vertical" }} value={form.recommendations} onChange={(e) => setForm({ ...form, recommendations: e.target.value })} placeholder="Ex: monitorar em 7 dias, sem necessidade de controle" />
      </Field>
      <Field label="Fotos">
        <input
          type="file" accept="image/*" multiple disabled={uploadingPhoto}
          onChange={(e) => { if (e.target.files.length > 0) handlePhotoFiles(Array.from(e.target.files)); e.target.value = ""; }}
          style={{ fontSize: 10.5, color: "#D6D3C7" }}
        />
        {uploadingPhoto && <div style={{ fontSize: 9.5, color: "#9BA298", marginTop: 6 }}>Enviando…</div>}
        {photoError && <div style={{ fontSize: 9.5, color: "#E38B84", marginTop: 6 }}>{photoError}</div>}
        {(form.photos || []).length > 0 && (
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 10 }}>
            {form.photos.map((p) => (
              <div key={p.id} style={{ position: "relative", width: 72, height: 72 }}>
                <a href={p.url} target="_blank" rel="noreferrer">
                  <img src={p.url} alt="" style={{ width: 72, height: 72, objectFit: "cover", borderRadius: 8, border: "1px solid #232B25", display: "block" }} />
                </a>
                <button onClick={() => handleDeletePhoto(p)} style={{
                  position: "absolute", top: -6, right: -6, width: 20, height: 20, borderRadius: "50%",
                  background: "#1A1F1B", border: "1px solid #2E362F", color: "#E38B84", cursor: "pointer",
                  display: "flex", alignItems: "center", justifyContent: "center", padding: 0,
                }}><X size={12} /></button>
              </div>
            ))}
          </div>
        )}
      </Field>
      <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 8 }}>
        <GhostBtn onClick={onClose}>Cancelar</GhostBtn>
        <PrimaryBtn onClick={() => form.harvestId && form.date && onSave(form)}>Salvar</PrimaryBtn>
      </div>
    </Modal>
  );
}

const PESTICIDE_TYPES = ["Herbicida", "Fungicida", "Inseticida", "Acaricida", "Outro"];

function ConfiguracoesView({
  varieties, pesticides, fertilizers, pests, diseases, weeds,
  onAddVariety, onEditVariety, onDeleteVariety,
  onAddPesticide, onEditPesticide, onDeletePesticide,
  onAddFertilizer, onEditFertilizer, onDeleteFertilizer,
  onAddPest, onEditPest, onDeletePest,
  onAddDisease, onEditDisease, onDeleteDisease,
  onAddWeed, onEditWeed, onDeleteWeed
}) {
  const [tab, setTab] = useState("variedades");
  const TABS = [
    { id: "variedades", label: "Cultivares", icon: Wheat },
    { id: "defensivos", label: "Defensivos", icon: FlaskConical },
    { id: "fertilizantes", label: "Fertilizantes", icon: Package },
    { id: "pragas", label: "Pragas", icon: Bug },
    { id: "doencas", label: "Doenças", icon: Microscope },
    { id: "daninhas", label: "Daninhas", icon: Flower2 },
  ];

  return (
    <div>
      <h2 style={{ fontFamily: "'Manrope', sans-serif", fontSize: 17.5, fontWeight: 800, color: "#F2F0E6", margin: "0 0 4px" }}>Configurações</h2>
      <p style={{ color: "#9BA298", fontSize: 11, margin: "0 0 22px" }}>Catálogos usados para preencher os dados dos talhões</p>

      <div style={{ display: "flex", gap: 8, marginBottom: 20, flexWrap: "wrap" }}>
        {TABS.map((t) => {
          const Icon = t.icon;
          const active = tab === t.id;
          return (
            <button key={t.id} onClick={() => setTab(t.id)} style={{
              display: "flex", alignItems: "center", gap: 7, padding: "8px 16px", borderRadius: 20,
              border: "1px solid " + (active ? "#1E4A20" : "#232B25"),
              background: active ? "#1E4A20" : "#161D19", color: active ? "#F5F2E8" : "#D6D3C7",
              fontSize: 10.5, fontWeight: 600, cursor: "pointer"
            }}>
              <Icon size={15} /> {t.label}
            </button>
          );
        })}
      </div>

      {tab === "variedades" && (
        <CatalogTable
          icon={Wheat}
          items={varieties}
          columns={[
            { key: "name", label: "Cultivar / híbrido" },
            { key: "culture", label: "Cultura", render: (v) => <CultureBadge culture={v.culture} /> },
            { key: "cycle", label: "Ciclo médio", render: (v) => v.cycle ? `${v.cycle} dias` : "—" },
          ]}
          emptyTitle="Nenhum cultivar cadastrado"
          emptySub="Cadastre os cultivares de soja e híbridos de milho que você utiliza."
          addLabel="Novo cultivar"
          onAdd={onAddVariety}
          onEdit={onEditVariety}
          onDelete={(item) => { if (confirm(`Remover o cultivar ${item.name}?`)) onDeleteVariety(item.id); }}
        />
      )}

      {tab === "defensivos" && (
        <CatalogTable
          icon={FlaskConical}
          items={pesticides}
          columns={[
            { key: "name", label: "Nome comercial" },
            { key: "type", label: "Tipo" },
            { key: "activeIngredient", label: "Princípio ativo" },
          ]}
          emptyTitle="Nenhum defensivo cadastrado"
          emptySub="Cadastre os herbicidas, fungicidas e inseticidas que você costuma recomendar."
          addLabel="Novo defensivo"
          onAdd={onAddPesticide}
          onEdit={onEditPesticide}
          onDelete={(item) => { if (confirm(`Remover o defensivo ${item.name}?`)) onDeletePesticide(item.id); }}
        />
      )}

      {tab === "fertilizantes" && (
        <CatalogTable
          icon={Package}
          items={fertilizers}
          columns={[
            { key: "name", label: "Nome" },
            { key: "type", label: "Formulação" },
          ]}
          emptyTitle="Nenhum fertilizante cadastrado"
          emptySub="Cadastre os adubos e fertilizantes que você costuma recomendar."
          addLabel="Novo fertilizante"
          onAdd={onAddFertilizer}
          onEdit={onEditFertilizer}
          onDelete={(item) => { if (confirm(`Remover o fertilizante ${item.name}?`)) onDeleteFertilizer(item.id); }}
        />
      )}

      {tab === "pragas" && (
        <CatalogTable
          icon={Bug}
          items={pests}
          columns={[
            { key: "name", label: "Nome popular" },
            { key: "scientificName", label: "Nome científico" },
            { key: "culture", label: "Cultura afetada", render: (p) => <AffectedCultureBadge value={p.culture} /> },
          ]}
          emptyTitle="Nenhuma praga cadastrada"
          emptySub="Cadastre as pragas que você costuma monitorar nas lavouras."
          addLabel="Nova praga"
          onAdd={onAddPest}
          onEdit={onEditPest}
          onDelete={(item) => { if (confirm(`Remover a praga ${item.name}?`)) onDeletePest(item.id); }}
        />
      )}

      {tab === "doencas" && (
        <CatalogTable
          icon={Microscope}
          items={diseases}
          columns={[
            { key: "name", label: "Nome" },
            { key: "agent", label: "Agente causador" },
            { key: "culture", label: "Cultura afetada", render: (d) => <AffectedCultureBadge value={d.culture} /> },
          ]}
          emptyTitle="Nenhuma doença cadastrada"
          emptySub="Cadastre as doenças que você costuma monitorar nas lavouras."
          addLabel="Nova doença"
          onAdd={onAddDisease}
          onEdit={onEditDisease}
          onDelete={(item) => { if (confirm(`Remover a doença ${item.name}?`)) onDeleteDisease(item.id); }}
        />
      )}

      {tab === "daninhas" && (
        <CatalogTable
          icon={Flower2}
          items={weeds}
          columns={[
            { key: "name", label: "Nome popular" },
            { key: "type", label: "Classificação" },
          ]}
          emptyTitle="Nenhuma daninha cadastrada"
          emptySub="Cadastre as plantas daninhas que você costuma monitorar nas lavouras."
          addLabel="Nova daninha"
          onAdd={onAddWeed}
          onEdit={onEditWeed}
          onDelete={(item) => { if (confirm(`Remover a daninha ${item.name}?`)) onDeleteWeed(item.id); }}
        />
      )}
    </div>
  );
}

function CatalogTable({ icon, items, columns, emptyTitle, emptySub, addLabel, onAdd, onEdit, onDelete }) {
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 14 }}>
        <PrimaryBtn onClick={onAdd}><Plus size={16} /> {addLabel}</PrimaryBtn>
      </div>
      {items.length === 0 ? (
        <EmptyState icon={icon} title={emptyTitle} sub={emptySub} action={<PrimaryBtn onClick={onAdd}><Plus size={16} /> {addLabel}</PrimaryBtn>} />
      ) : (
        <div style={{ background: "#161D19", border: "1px solid #232B25", borderRadius: 12, overflow: "hidden" }}>
          <table>
            <thead>
              <tr>
                {columns.map((col) => <th key={col.key}>{col.label}</th>)}
                <th></th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id}>
                  {columns.map((col, i) => (
                    <td key={col.key} style={i === 0 ? { fontWeight: 600, color: "#F2F0E6" } : undefined}>
                      {col.render ? col.render(item) : (item[col.key] || "—")}
                    </td>
                  ))}
                  <td>
                    <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
                      <button onClick={() => onEdit(item)} style={iconBtnStyle}><Pencil size={14} /></button>
                      <button onClick={() => onDelete(item)} style={iconBtnStyle}><Trash2 size={14} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function VarietyModal({ data, onSave, onClose }) {
  const [form, setForm] = useState(data || { name: "", culture: "Soja", cycle: "" });
  return (
    <Modal title={data?.id ? "Editar cultivar" : "Novo cultivar"} onClose={onClose}>
      <Field label="Nome do cultivar / híbrido">
        <input style={inputStyle} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Ex: TMG 7062" />
      </Field>
      <Field label="Cultura">
        <select style={inputStyle} value={form.culture} onChange={(e) => setForm({ ...form, culture: e.target.value })}>
          <option value="Soja">Soja</option>
          <option value="Milho">Milho</option>
        </select>
      </Field>
      <Field label="Ciclo médio (dias)">
        <input type="number" style={inputStyle} value={form.cycle} onChange={(e) => setForm({ ...form, cycle: e.target.value })} placeholder="Ex: 110" />
      </Field>
      <div style={{ fontSize: 10, color: "#6B7268", marginTop: -8, marginBottom: 8 }}>
        Obrigatório — é o que permite estimar a data de colheita nas safras.
      </div>
      <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 8 }}>
        <GhostBtn onClick={onClose}>Cancelar</GhostBtn>
        <PrimaryBtn onClick={() => form.name.trim() && form.cycle && Number(form.cycle) > 0 && onSave(form)}>Salvar</PrimaryBtn>
      </div>
    </Modal>
  );
}

function PesticideModal({ data, onSave, onClose }) {
  const [form, setForm] = useState(data || { name: "", type: "Herbicida", activeIngredient: "" });
  return (
    <Modal title={data?.id ? "Editar defensivo" : "Novo defensivo"} onClose={onClose}>
      <Field label="Nome comercial">
        <input style={inputStyle} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Ex: Fox Xpro" />
      </Field>
      <Field label="Tipo">
        <select style={inputStyle} value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
          {PESTICIDE_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
      </Field>
      <Field label="Princípio ativo">
        <input style={inputStyle} value={form.activeIngredient} onChange={(e) => setForm({ ...form, activeIngredient: e.target.value })} placeholder="Ex: Bixafem + Protioconazol + Trifloxistrobina" />
      </Field>
      <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 8 }}>
        <GhostBtn onClick={onClose}>Cancelar</GhostBtn>
        <PrimaryBtn onClick={() => form.name.trim() && onSave(form)}>Salvar</PrimaryBtn>
      </div>
    </Modal>
  );
}

function FertilizerModal({ data, onSave, onClose }) {
  const [form, setForm] = useState(data || { name: "", type: "" });
  return (
    <Modal title={data?.id ? "Editar fertilizante" : "Novo fertilizante"} onClose={onClose}>
      <Field label="Nome">
        <input style={inputStyle} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Ex: MAP" />
      </Field>
      <Field label="Formulação (opcional)">
        <input style={inputStyle} value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} placeholder="Ex: 10-52-00" />
      </Field>
      <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 8 }}>
        <GhostBtn onClick={onClose}>Cancelar</GhostBtn>
        <PrimaryBtn onClick={() => form.name.trim() && onSave(form)}>Salvar</PrimaryBtn>
      </div>
    </Modal>
  );
}

const AFFECTED_CULTURE_OPTIONS = ["Soja", "Milho", "Ambas"];
const DISEASE_AGENTS = ["Fungo", "Bactéria", "Vírus", "Nematoide", "Outro"];
const WEED_TYPES = ["Folha larga", "Gramínea", "Ciperácea", "Outro"];

function PestModal({ data, onSave, onClose }) {
  const [form, setForm] = useState({ name: "", scientificName: "", culture: "Ambas", ...(data || {}) });
  return (
    <Modal title={data?.id ? "Editar praga" : "Nova praga"} onClose={onClose}>
      <Field label="Nome popular">
        <input style={inputStyle} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Ex: Lagarta-do-cartucho" />
      </Field>
      <Field label="Nome científico (opcional)">
        <input style={inputStyle} value={form.scientificName} onChange={(e) => setForm({ ...form, scientificName: e.target.value })} placeholder="Ex: Spodoptera frugiperda" />
      </Field>
      <Field label="Cultura afetada">
        <select style={inputStyle} value={form.culture} onChange={(e) => setForm({ ...form, culture: e.target.value })}>
          {AFFECTED_CULTURE_OPTIONS.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
      </Field>
      <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 8 }}>
        <GhostBtn onClick={onClose}>Cancelar</GhostBtn>
        <PrimaryBtn onClick={() => form.name.trim() && onSave(form)}>Salvar</PrimaryBtn>
      </div>
    </Modal>
  );
}

function DiseaseModal({ data, onSave, onClose }) {
  const [form, setForm] = useState({ name: "", agent: "Fungo", culture: "Ambas", ...(data || {}) });
  return (
    <Modal title={data?.id ? "Editar doença" : "Nova doença"} onClose={onClose}>
      <Field label="Nome">
        <input style={inputStyle} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Ex: Ferrugem-asiática" />
      </Field>
      <Field label="Agente causador">
        <select style={inputStyle} value={form.agent} onChange={(e) => setForm({ ...form, agent: e.target.value })}>
          {DISEASE_AGENTS.map((a) => <option key={a} value={a}>{a}</option>)}
        </select>
      </Field>
      <Field label="Cultura afetada">
        <select style={inputStyle} value={form.culture} onChange={(e) => setForm({ ...form, culture: e.target.value })}>
          {AFFECTED_CULTURE_OPTIONS.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
      </Field>
      <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 8 }}>
        <GhostBtn onClick={onClose}>Cancelar</GhostBtn>
        <PrimaryBtn onClick={() => form.name.trim() && onSave(form)}>Salvar</PrimaryBtn>
      </div>
    </Modal>
  );
}

function WeedModal({ data, onSave, onClose }) {
  const [form, setForm] = useState({ name: "", type: "Folha larga", ...(data || {}) });
  return (
    <Modal title={data?.id ? "Editar daninha" : "Nova daninha"} onClose={onClose}>
      <Field label="Nome popular">
        <input style={inputStyle} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Ex: Buva" />
      </Field>
      <Field label="Classificação">
        <select style={inputStyle} value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
          {WEED_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
      </Field>
      <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 8 }}>
        <GhostBtn onClick={onClose}>Cancelar</GhostBtn>
        <PrimaryBtn onClick={() => form.name.trim() && onSave(form)}>Salvar</PrimaryBtn>
      </div>
    </Modal>
  );
}

const TEAM_ROLES = ["Técnico agrícola", "Agrônomo", "Administrativo", "Proprietário", "Outro"];

const ROLE_LABELS = { master: "Master", administrador: "Administrador", colaborador: "Técnico" };

function EquipeView({ team, teamAvatars, isMaster, onAdd, onEdit, onDelete, onPromote, onDemote }) {
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18, gap: 12 }}>
        <div>
          <h2 style={{ fontFamily: "'Manrope', sans-serif", fontSize: 19, fontWeight: 800, color: "#F2F0E6", margin: "0 0 4px" }}>Equipe</h2>
          <p style={{ color: "#9BA298", fontSize: 10.5, margin: 0 }}>Colaboradores que acompanham as visitas técnicas</p>
        </div>
        {isMaster && <PrimaryBtn onClick={onAdd}><Plus size={16} /> Novo colaborador</PrimaryBtn>}
      </div>

      {team.length === 0 ? (
        <EmptyState icon={UserCog} title="Nenhum colaborador cadastrado" sub="Cadastre sua equipe para atribuir as visitas técnicas a cada um."
          action={isMaster ? <PrimaryBtn onClick={onAdd}><Plus size={16} /> Novo colaborador</PrimaryBtn> : undefined} />
      ) : (
        <div style={{ background: "#161D19", border: "1px solid #232B25", borderRadius: 12, overflow: "hidden" }}>
          <table>
            <thead><tr><th>Nome</th><th>Função</th><th>Papel</th><th>Telefone</th><th>E-mail</th>{isMaster && <th></th>}</tr></thead>
            <tbody>
              {team.map((t) => (
                <tr key={t.id}>
                  <td style={{ fontWeight: 600, color: "#F2F0E6" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
                      <Avatar name={t.name} url={teamAvatars?.[t.id]} />
                      {t.name}
                    </div>
                  </td>
                  <td>{t.title || "—"}</td>
                  <td>{ROLE_LABELS[t.role] || t.role}</td>
                  <td>{t.phone || "—"}</td>
                  <td>{t.email || "—"}</td>
                  {isMaster && (
                    <td>
                      <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
                        {t.role === "colaborador" && (
                          <button onClick={() => { if (confirm(`Promover ${t.name} a Administrador? Ele passa a ver o módulo Financeiro.`)) onPromote(t.id); }} style={iconBtnStyle} title="Promover a Administrador"><Wallet size={14} /></button>
                        )}
                        {t.role === "administrador" && (
                          <button onClick={() => { if (confirm(`Rebaixar ${t.name} a Técnico? Ele deixa de ver o módulo Financeiro.`)) onDemote(t.id); }} style={iconBtnStyle} title="Rebaixar a Técnico"><Wallet size={14} color="#E3B455" /></button>
                        )}
                        <button onClick={() => onEdit(t)} style={iconBtnStyle}><Pencil size={14} /></button>
                        {t.role !== "master" && (
                          <button onClick={() => { if (confirm(`Remover ${t.name} da equipe?`)) onDelete(t.id); }} style={iconBtnStyle}><Trash2 size={14} /></button>
                        )}
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

const ACTIVITY_ACTION_LABELS = { create: "criou", update: "editou", delete: "excluiu" };
const ACTIVITY_ENTITY_LABELS = {
  client: "o cliente", property: "a propriedade", field: "o talhão", harvest: "a safra",
  visit: "a visita", task: "o item da agenda", document: "o documento",
  team: "o colaborador", clientAccess: "o acesso do cliente",
  finance: "o honorário de", bonus: "a bonificação de", settings: "a configuração",
  bill: "a despesa", soilAnalysis: "a análise de solo de",
};

function ActivityLogView({ log }) {
  const sorted = [...log].sort((a, b) => b.at.localeCompare(a.at)).slice(0, 300);
  return (
    <div>
      <div style={{ marginBottom: 18 }}>
        <h2 style={{ fontFamily: "'Manrope', sans-serif", fontSize: 17.5, fontWeight: 800, color: "#F2F0E6", margin: "0 0 4px" }}>Atividade</h2>
        <p style={{ color: "#9BA298", fontSize: 10.5, margin: 0 }}>Quem criou, editou ou excluiu o quê, e quando.</p>
      </div>
      {sorted.length === 0 ? (
        <EmptyState icon={History} title="Nenhuma atividade registrada ainda" sub="As ações feitas a partir de agora vão aparecer aqui." />
      ) : (
        <div style={{ background: "#161D19", border: "1px solid #232B25", borderRadius: 12, overflow: "hidden" }}>
          <table>
            <thead><tr><th>Quando</th><th>Quem</th><th>O que</th></tr></thead>
            <tbody>
              {sorted.map((e) => (
                <tr key={e.id}>
                  <td style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, whiteSpace: "nowrap" }}>{fmtDateTime(e.at)}</td>
                  <td style={{ fontWeight: 600, color: "#F2F0E6" }}>{e.userName}</td>
                  <td>
                    {ACTIVITY_ACTION_LABELS[e.action] || e.action} {ACTIVITY_ENTITY_LABELS[e.entityType] || e.entityType} <strong style={{ color: "#F2F0E6" }}>{e.entityName}</strong>
                    {e.details && <div style={{ fontSize: 9.5, color: "#6B7268", marginTop: 2 }}>{e.details}</div>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

const FINANCE_STATUS_META = {
  pago: { label: "Pago", bg: "#16301A", color: "#7BC142" },
  pendente: { label: "Pendente", bg: "#332811", color: "#E3B455" },
};

function FinanceStatusBadge({ status }) {
  const meta = FINANCE_STATUS_META[status] || FINANCE_STATUS_META.pendente;
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", padding: "3px 9px",
      borderRadius: 20, background: meta.bg, color: meta.color, fontSize: 9.5, fontWeight: 600, whiteSpace: "nowrap"
    }}>
      {meta.label}
    </span>
  );
}

function fmtCurrency(n) {
  return (Number(n) || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

const FINANCE_TYPE_LABELS = { mensalidade: "Mensalidade", projeto: "Projeto", analise_solo: "Análise de Solo" };
const FINANCE_TYPES_WITH_SHARE = ["projeto", "analise_solo"];

function parseOFXStatement(text) {
  const transactions = [];
  const trnRegex = /<STMTTRN>([\s\S]*?)<\/STMTTRN>/gi;
  let match;
  while ((match = trnRegex.exec(text))) {
    const block = match[1];
    const get = (tag) => {
      const m = block.match(new RegExp(`<${tag}>([^<\r\n]*)`, "i"));
      return m ? m[1].trim() : "";
    };
    const dtPosted = get("DTPOSTED");
    const amount = parseFloat(get("TRNAMT"));
    const memo = get("MEMO") || get("NAME");
    if (!dtPosted || Number.isNaN(amount)) continue;
    const date = `${dtPosted.slice(0, 4)}-${dtPosted.slice(4, 6)}-${dtPosted.slice(6, 8)}`;
    transactions.push({ date, amount, description: memo, type: amount >= 0 ? "credit" : "debit" });
  }
  return transactions;
}

function parseBrazilianStatementDate(s) {
  const m = s.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (m) return `${m[3]}-${m[2]}-${m[1]}`;
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  return null;
}

function parseCSVStatement(text) {
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) return [];
  const delim = lines[0].includes(";") ? ";" : ",";
  const header = lines[0].split(delim).map((h) => h.trim().toLowerCase());
  const dateIdx = header.findIndex((h) => h.includes("data"));
  const valueIdx = header.findIndex((h) => h.includes("valor"));
  const descIdx = header.findIndex((h) => h.includes("hist") || h.includes("descri"));
  if (dateIdx === -1 || valueIdx === -1) return [];
  const transactions = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(delim);
    const rawDate = (cols[dateIdx] || "").trim();
    const rawValue = (cols[valueIdx] || "").trim().replace(/\./g, "").replace(",", ".");
    const amount = parseFloat(rawValue);
    const date = parseBrazilianStatementDate(rawDate);
    if (!date || Number.isNaN(amount)) continue;
    transactions.push({ date, amount, description: descIdx >= 0 ? (cols[descIdx] || "").trim() : "", type: amount >= 0 ? "credit" : "debit" });
  }
  return transactions;
}

function parseBankStatement(fileName, text) {
  if (/\.ofx$/i.test(fileName) || text.includes("<STMTTRN>")) return parseOFXStatement(text);
  return parseCSVStatement(text);
}

function normalizeDescription(text) {
  return (text || "")
    .normalize("NFD").replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/\d+/g, "")
    .replace(/[^a-z\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function matchBankTransactions(transactions, finances, bills, categoryMemory) {
  const pendingFinances = finances.filter((f) => f.status === "pendente");
  const pendingBills = (bills || []).filter((b) => b.status === "pendente");
  const usedFinanceIds = new Set();
  const usedBillIds = new Set();

  const credits = transactions.filter((t) => t.type === "credit").map((t) => {
    const candidate = pendingFinances.find((f) => !usedFinanceIds.has(f.id) && Math.abs(Number(f.amount) - t.amount) < 0.01);
    if (candidate) usedFinanceIds.add(candidate.id);
    return { transaction: t, kind: "credit", match: candidate || null };
  });

  const debits = transactions.filter((t) => t.type === "debit").map((t) => {
    const candidate = pendingBills.find((b) => !usedBillIds.has(b.id) && Math.abs(Number(b.amount) - t.amount) < 0.01);
    if (candidate) usedBillIds.add(candidate.id);
    const suggestedCategory = candidate ? "" : (categoryMemory || {})[normalizeDescription(t.description)] || "";
    return { transaction: t, kind: "debit", match: candidate || null, suggestedCategory };
  });

  return [...credits, ...debits].sort((a, b) => (a.transaction.date || "").localeCompare(b.transaction.date || ""));
}

function computeMonthFinanceSummary({ finances, bonuses, bills, settings, clients, team, properties, fields, month }) {
  const monthFinances = finances.filter((f) => f.referenceMonth === month);
  const totalRecebido = monthFinances.filter((f) => f.status === "pago").reduce((s, f) => s + Number(f.amount), 0);
  const totalPendente = monthFinances.filter((f) => f.status === "pendente").reduce((s, f) => s + Number(f.amount), 0);

  const monthBills = (bills || []).filter((b) => b.referenceMonth === month);
  const totalDespesasPagas = monthBills.filter((b) => b.status === "pago").reduce((s, b) => s + Number(b.amount), 0);
  const totalDespesasPendentes = monthBills.filter((b) => b.status === "pendente").reduce((s, b) => s + Number(b.amount), 0);

  const gestorByClientId = {};
  clients.forEach((c) => { if (c.gestorId) gestorByClientId[c.id] = c.gestorId; });

  const areaByGestor = {};
  fields.forEach((f) => {
    const property = properties.find((p) => p.id === f.propertyId);
    if (!property) return;
    const client = clients.find((c) => c.id === property.clientId);
    if (!client?.gestorId) return;
    areaByGestor[client.gestorId] = (areaByGestor[client.gestorId] || 0) + fieldAreaHa(f);
  });

  const monthBonuses = bonuses.filter((b) => (b.date || "").slice(0, 7) === month);

  const projectShareByGestor = {};
  monthFinances
    .filter((f) => FINANCE_TYPES_WITH_SHARE.includes(f.type) && f.status === "pago")
    .forEach((f) => {
      const gestorId = f.responsibleGestorId || gestorByClientId[f.clientId];
      if (!gestorId) return;
      projectShareByGestor[gestorId] = (projectShareByGestor[gestorId] || 0) + Number(f.amount) * (Number(settings.projectShareRate || 0) / 100);
    });

  const proLaboreRows = team.map((t) => {
    const areaHa = areaByGestor[t.id] || 0;
    const base = areaHa * (Number(settings.commissionRatePerHaYear || 0) / 12);
    const projectShare = projectShareByGestor[t.id] || 0;
    const bonusTotal = monthBonuses.filter((b) => b.gestorId === t.id).reduce((s, b) => s + Number(b.amount), 0);
    return { gestor: t, areaHa, base, projectShare, bonusTotal, total: base + projectShare + bonusTotal };
  });

  const totalProLabore = proLaboreRows.reduce((s, r) => s + r.total, 0);
  const totalDespesasDoMes = totalDespesasPagas + totalDespesasPendentes;
  const totalSaidasPrevistas = totalProLabore + totalDespesasDoMes;
  const totalEntradasPrevistas = totalRecebido + totalPendente;

  return {
    monthFinances, totalRecebido, totalPendente, totalEntradasPrevistas, proLaboreRows, totalProLabore,
    monthBills, totalDespesasPagas, totalDespesasPendentes, totalDespesasDoMes, totalSaidasPrevistas,
  };
}

function CashFlowChart({ months }) {
  const width = 560, height = 190, padding = 28, baseline = height - 26, top = 14;
  const max = Math.max(1, ...months.flatMap((m) => [m.entradas, m.saidas]));
  const groupWidth = (width - padding * 2) / months.length;
  const barWidth = Math.min(20, (groupWidth - 16) / 2);
  return (
    <svg viewBox={`0 0 ${width} ${height}`} style={{ width: "100%", height: "auto", display: "block" }}>
      {[0, 0.25, 0.5, 0.75, 1].map((f) => (
        <line key={f} x1={padding} x2={width - padding} y1={baseline - f * (baseline - top)} y2={baseline - f * (baseline - top)} stroke="#232B25" strokeWidth="1" />
      ))}
      {months.map((m, i) => {
        const cx = padding + i * groupWidth + groupWidth / 2;
        const hE = (m.entradas / max) * (baseline - top);
        const hS = (m.saidas / max) * (baseline - top);
        return (
          <g key={m.month}>
            <rect x={cx - barWidth - 3} y={baseline - hE} width={barWidth} height={hE} rx={2} fill="#7BC142" />
            <rect x={cx + 3} y={baseline - hS} width={barWidth} height={hS} rx={2} fill="#E38B84" />
            <text x={cx} y={baseline + 14} textAnchor="middle" fontSize="9" fill="#9BA298">{m.label}</text>
          </g>
        );
      })}
    </svg>
  );
}

function FinanceiroView({
  finances, bonuses, bills, settings, clients, team, properties, fields,
  onAddFinance, onEditFinance, onDeleteFinance,
  onAddBonus, onEditBonus, onDeleteBonus,
  onAddBill, onEditBill, onDeleteBill,
  onChangeRate, onChangeProjectRate, onReconcile,
}) {
  const [tab, setTab] = useState("honorarios");
  const [month, setMonth] = useState(() => new Date().toISOString().slice(0, 7));
  const [rateInput, setRateInput] = useState(String(settings.commissionRatePerHaYear ?? 30));
  const [projectRateInput, setProjectRateInput] = useState(String(settings.projectShareRate ?? 20));

  const summary = useMemo(
    () => computeMonthFinanceSummary({ finances, bonuses, bills, settings, clients, team, properties, fields, month }),
    [finances, bonuses, bills, settings, clients, team, properties, fields, month]
  );
  const monthFinances = [...summary.monthFinances].sort((a, b) => (b.date || "").localeCompare(a.date || ""));
  const { totalRecebido, totalPendente } = summary;
  const monthBonuses = bonuses.filter((b) => (b.date || "").slice(0, 7) === month).sort((a, b) => (b.date || "").localeCompare(a.date || ""));
  const monthBillsSorted = [...summary.monthBills].sort((a, b) => (b.date || "").localeCompare(a.date || ""));
  const { totalDespesasPagas, totalDespesasPendentes } = summary;

  const commissionRows = summary.proLaboreRows
    .filter((r) => r.areaHa > 0 || r.projectShare > 0 || r.bonusTotal > 0)
    .sort((a, b) => b.total - a.total);

  const totalComissoes = summary.totalProLabore;

  const cashFlowMonths = useMemo(() => {
    const result = [];
    for (let i = 5; i >= 0; i--) {
      const m = addMonthsToReferenceMonth(month, -i);
      const s = computeMonthFinanceSummary({ finances, bonuses, bills, settings, clients, team, properties, fields, month: m });
      const [y, mm] = m.split("-").map(Number);
      const label = new Date(y, mm - 1, 1).toLocaleDateString("pt-BR", { month: "short" }).replace(".", "");
      result.push({ month: m, label, entradas: s.totalEntradasPrevistas, saidas: s.totalSaidasPrevistas });
    }
    return result;
  }, [finances, bonuses, bills, settings, clients, team, properties, fields, month]);

  const pendingItems = useMemo(() => {
    const fin = summary.monthFinances.filter((f) => f.status === "pendente").map((f) => ({
      id: `f-${f.id}`, kind: "entrada", amount: Number(f.amount), date: f.date,
      label: clients.find((c) => c.id === f.clientId)?.name || "Honorário",
    }));
    const desp = summary.monthBills.filter((b) => b.status === "pendente").map((b) => ({
      id: `b-${b.id}`, kind: "saida", amount: Number(b.amount), date: b.date,
      label: b.description,
    }));
    return [...fin, ...desp].sort((a, b) => (a.date || "").localeCompare(b.date || ""));
  }, [summary, clients]);

  const reconciledFeed = useMemo(() => {
    const fin = finances.filter((f) => f.reconciledBank).map((f) => ({
      id: `f-${f.id}`, kind: "entrada", amount: Number(f.amount), date: f.date, at: f.reconciledAt || f.date,
      label: clients.find((c) => c.id === f.clientId)?.name || "Honorário",
    }));
    const desp = bills.filter((b) => b.reconciledBank).map((b) => ({
      id: `b-${b.id}`, kind: "saida", amount: Number(b.amount), date: b.date, at: b.reconciledAt || b.date,
      label: b.description,
    }));
    return [...fin, ...desp].sort((a, b) => (b.at || "").localeCompare(a.at || "")).slice(0, 8);
  }, [finances, bills, clients]);

  const saldoPrevisto = summary.totalEntradasPrevistas - summary.totalSaidasPrevistas;

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18, gap: 12, flexWrap: "wrap" }}>
        <div>
          <h2 style={{ fontFamily: "'Manrope', sans-serif", fontSize: 17.5, fontWeight: 800, color: "#F2F0E6", margin: "0 0 4px" }}>Financeiro</h2>
          <p style={{ color: "#9BA298", fontSize: 10.5, margin: 0 }}>Honorários recebidos e pró-labore da equipe</p>
        </div>
        <input type="month" style={{ ...inputStyle, width: 160 }} value={month} onChange={(e) => setMonth(e.target.value)} />
      </div>

      <div style={{ display: "flex", gap: 14, marginBottom: 14, flexWrap: "wrap" }}>
        <StatCard label="Entradas previstas no mês" value={fmtCurrency(summary.totalEntradasPrevistas)} accent="#7BC142"
          sub={`${fmtCurrency(totalRecebido)} recebido`} />
        <StatCard label="Saídas previstas no mês" value={fmtCurrency(summary.totalSaidasPrevistas)} accent="#E3B455"
          sub={`Pró-labore ${fmtCurrency(summary.totalProLabore)} + despesas ${fmtCurrency(summary.totalDespesasDoMes)}`} />
        <StatCard label="Saldo previsto no mês" value={fmtCurrency(saldoPrevisto)} accent={saldoPrevisto >= 0 ? "#7BC142" : "#E38B84"} />
      </div>

      <div style={{ display: "flex", gap: 18, flexWrap: "wrap", marginBottom: 14 }}>
        <div style={{ background: "#161D19", border: "1px solid #232B25", borderRadius: 12, padding: 18, flex: 2, minWidth: 320 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12, flexWrap: "wrap", gap: 8 }}>
            <div style={{ fontSize: 10.5, fontWeight: 600, color: "#D6D3C7" }}>Fluxo de caixa · últimos 6 meses</div>
            <div style={{ display: "flex", gap: 12, fontSize: 9.5, color: "#9BA298" }}>
              <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
                <span style={{ width: 8, height: 8, borderRadius: 2, background: "#7BC142", display: "inline-block" }} />Entradas
              </span>
              <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
                <span style={{ width: 8, height: 8, borderRadius: 2, background: "#E38B84", display: "inline-block" }} />Saídas
              </span>
            </div>
          </div>
          <CashFlowChart months={cashFlowMonths} />
        </div>

        <div style={{ background: "#161D19", border: "1px solid #232B25", borderRadius: 12, padding: 18, flex: 1, minWidth: 240 }}>
          <div style={{ fontSize: 10.5, fontWeight: 600, color: "#D6D3C7", marginBottom: 12 }}>Pendências do mês</div>
          {pendingItems.length === 0 ? (
            <div style={{ color: "#6B7268", fontSize: 10.5 }}>Nada pendente neste mês.</div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 9, maxHeight: 210, overflowY: "auto" }}>
              {pendingItems.map((item) => (
                <div key={item.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, fontSize: 10 }}>
                  <span style={{ color: "#D6D3C7", minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    <strong style={{ color: item.kind === "entrada" ? "#7BC142" : "#E38B84", marginRight: 5 }}>{item.kind === "entrada" ? "↑" : "↓"}</strong>
                    {item.label}
                  </span>
                  <strong style={{ color: "#F2F0E6", whiteSpace: "nowrap" }}>{fmtCurrency(item.amount)}</strong>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div style={{ background: "#161D19", border: "1px solid #232B25", borderRadius: 12, padding: 18, marginBottom: 20 }}>
        <div style={{ fontSize: 10.5, fontWeight: 600, color: "#D6D3C7", marginBottom: 12 }}>Últimas movimentações conciliadas</div>
        {reconciledFeed.length === 0 ? (
          <div style={{ color: "#6B7268", fontSize: 10.5 }}>Nenhuma conciliação bancária registrada ainda.</div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
            {reconciledFeed.map((item) => (
              <div key={item.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, fontSize: 10.5 }}>
                <span style={{ color: "#D6D3C7" }}>
                  <strong style={{ color: item.kind === "entrada" ? "#7BC142" : "#E38B84", marginRight: 5 }}>{item.kind === "entrada" ? "↑" : "↓"}</strong>
                  {item.label} <span style={{ color: "#6B7268" }}>· {fmtDate(item.date)}</span>
                </span>
                <strong style={{ color: "#F2F0E6" }}>{fmtCurrency(item.amount)}</strong>
              </div>
            ))}
          </div>
        )}
      </div>

      <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
        <button onClick={() => setTab("honorarios")} style={{
          display: "flex", alignItems: "center", gap: 7, padding: "8px 16px", borderRadius: 20,
          border: "1px solid " + (tab === "honorarios" ? "#1E4A20" : "#232B25"),
          background: tab === "honorarios" ? "#1E4A20" : "#161D19", color: tab === "honorarios" ? "#F5F2E8" : "#D6D3C7",
          fontSize: 10.5, fontWeight: 600, cursor: "pointer"
        }}>
          <Wallet size={15} /> Honorários
        </button>
        <button onClick={() => setTab("comissoes")} style={{
          display: "flex", alignItems: "center", gap: 7, padding: "8px 16px", borderRadius: 20,
          border: "1px solid " + (tab === "comissoes" ? "#1E4A20" : "#232B25"),
          background: tab === "comissoes" ? "#1E4A20" : "#161D19", color: tab === "comissoes" ? "#F5F2E8" : "#D6D3C7",
          fontSize: 10.5, fontWeight: 600, cursor: "pointer"
        }}>
          <UserCog size={15} /> Pró-labore
        </button>
        <button onClick={() => setTab("despesas")} style={{
          display: "flex", alignItems: "center", gap: 7, padding: "8px 16px", borderRadius: 20,
          border: "1px solid " + (tab === "despesas" ? "#1E4A20" : "#232B25"),
          background: tab === "despesas" ? "#1E4A20" : "#161D19", color: tab === "despesas" ? "#F5F2E8" : "#D6D3C7",
          fontSize: 10.5, fontWeight: 600, cursor: "pointer"
        }}>
          <Receipt size={15} /> Despesas
        </button>
      </div>

      {tab === "honorarios" && (
        <div>
          <div style={{ display: "flex", gap: 14, marginBottom: 20, flexWrap: "wrap" }}>
            <StatCard label="Recebido no mês" value={fmtCurrency(totalRecebido)} accent="#7BC142" />
            <StatCard label="Pendente no mês" value={fmtCurrency(totalPendente)} accent="#E3B455" />
          </div>
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginBottom: 12 }}>
            <GhostBtn onClick={onReconcile}><Wallet size={14} /> Conciliar extrato</GhostBtn>
            <PrimaryBtn onClick={onAddFinance}><Plus size={16} /> Novo honorário</PrimaryBtn>
          </div>
          {monthFinances.length === 0 ? (
            <EmptyState icon={Wallet} title="Nenhum honorário lançado neste mês" sub="Registre os pagamentos recebidos dos clientes." />
          ) : (
            <div style={{ background: "#161D19", border: "1px solid #232B25", borderRadius: 12, overflow: "hidden" }}>
              <table>
                <thead><tr><th>Cliente</th><th>Tipo</th><th>Gestor responsável</th><th>Data</th><th>Valor</th><th>Status</th><th></th></tr></thead>
                <tbody>
                  {monthFinances.map((f) => {
                    const client = clients.find((c) => c.id === f.clientId);
                    const responsible = team.find((t) => t.id === f.responsibleGestorId);
                    return (
                      <tr key={f.id}>
                        <td style={{ fontWeight: 600, color: "#F2F0E6" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                            {f.recurring && <Repeat size={12} color="#6B7268" />}
                            {client?.name || "—"}
                          </div>
                        </td>
                        <td>{FINANCE_TYPE_LABELS[f.type] || "Mensalidade"}</td>
                        <td>{responsible?.name || "—"}</td>
                        <td style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10 }}>{fmtDate(f.date)}</td>
                        <td>{fmtCurrency(f.amount)}</td>
                        <td><FinanceStatusBadge status={f.status} /></td>
                        <td>
                          <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
                            <button onClick={() => onEditFinance(f)} style={iconBtnStyle}><Pencil size={14} /></button>
                            <button onClick={() => { if (confirm("Remover este lançamento?")) onDeleteFinance(f.id); }} style={iconBtnStyle}><Trash2 size={14} /></button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {tab === "comissoes" && (
        <div>
          <div style={{ display: "flex", gap: 14, marginBottom: 20, flexWrap: "wrap", alignItems: "flex-end" }}>
            <StatCard label="Total de pró-labore no mês" value={fmtCurrency(totalComissoes)} accent="#7BC142" />
            <div style={{ background: "#161D19", border: "1px solid #232B25", borderRadius: 12, padding: "16px 18px" }}>
              <div style={{ fontSize: 9.5, color: "#9BA298", fontWeight: 600, marginBottom: 8, textTransform: "uppercase", letterSpacing: ".03em" }}>Por hectare (R$/ha/ano)</div>
              <div style={{ display: "flex", gap: 8 }}>
                <input type="number" style={{ ...inputStyle, width: 100 }} value={rateInput} onChange={(e) => setRateInput(e.target.value)} />
                <GhostBtn onClick={() => onChangeRate(Number(rateInput) || 0)}>Salvar</GhostBtn>
              </div>
              <div style={{ fontSize: 9.5, color: "#6B7268", marginTop: 6 }}>= {fmtCurrency((Number(rateInput) || 0) / 12)}/ha/mês</div>
            </div>
            <div style={{ background: "#161D19", border: "1px solid #232B25", borderRadius: 12, padding: "16px 18px" }}>
              <div style={{ fontSize: 9.5, color: "#9BA298", fontWeight: 600, marginBottom: 8, textTransform: "uppercase", letterSpacing: ".03em" }}>De projetos (% dos honorários pagos)</div>
              <div style={{ display: "flex", gap: 8 }}>
                <input type="number" style={{ ...inputStyle, width: 100 }} value={projectRateInput} onChange={(e) => setProjectRateInput(e.target.value)} />
                <GhostBtn onClick={() => onChangeProjectRate(Number(projectRateInput) || 0)}>Salvar</GhostBtn>
              </div>
            </div>
          </div>

          {commissionRows.length === 0 ? (
            <div style={{ color: "#6B7268", fontSize: 10.5, marginBottom: 20 }}>Nenhum gestor com talhões atribuídos, honorário de projeto ou bonificação neste mês.</div>
          ) : (
            <div style={{ background: "#161D19", border: "1px solid #232B25", borderRadius: 12, overflow: "hidden", marginBottom: 24 }}>
              <table>
                <thead><tr><th>Gestor</th><th>Área atendida</th><th>Pró-labore (ha)</th><th>Pró-labore (projetos)</th><th>Bonificações</th><th>Total</th></tr></thead>
                <tbody>
                  {commissionRows.map((r) => (
                    <tr key={r.gestor.id}>
                      <td style={{ fontWeight: 600, color: "#F2F0E6" }}>{r.gestor.name}</td>
                      <td>{r.areaHa.toLocaleString("pt-BR")} ha</td>
                      <td>{fmtCurrency(r.base)}</td>
                      <td>{fmtCurrency(r.projectShare)}</td>
                      <td>{fmtCurrency(r.bonusTotal)}</td>
                      <td style={{ fontWeight: 600, color: "#7BC142" }}>{fmtCurrency(r.total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <div style={{ fontSize: 10.5, fontWeight: 600, color: "#D6D3C7" }}>Bonificações do mês</div>
            <PrimaryBtn onClick={onAddBonus}><Plus size={16} /> Nova bonificação</PrimaryBtn>
          </div>
          {monthBonuses.length === 0 ? (
            <EmptyState icon={Wallet} title="Nenhuma bonificação lançada neste mês" sub="Lance bonificações avulsas por projeto elaborado." />
          ) : (
            <div style={{ background: "#161D19", border: "1px solid #232B25", borderRadius: 12, overflow: "hidden" }}>
              <table>
                <thead><tr><th>Gestor</th><th>Descrição</th><th>Data</th><th>Valor</th><th></th></tr></thead>
                <tbody>
                  {monthBonuses.map((b) => {
                    const gestor = team.find((t) => t.id === b.gestorId);
                    return (
                      <tr key={b.id}>
                        <td style={{ fontWeight: 600, color: "#F2F0E6" }}>{gestor?.name || "—"}</td>
                        <td>{b.description}</td>
                        <td style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10 }}>{fmtDate(b.date)}</td>
                        <td>{fmtCurrency(b.amount)}</td>
                        <td>
                          <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
                            <button onClick={() => onEditBonus(b)} style={iconBtnStyle}><Pencil size={14} /></button>
                            <button onClick={() => { if (confirm("Remover esta bonificação?")) onDeleteBonus(b.id); }} style={iconBtnStyle}><Trash2 size={14} /></button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {tab === "despesas" && (
        <div>
          <div style={{ display: "flex", gap: 14, marginBottom: 20, flexWrap: "wrap" }}>
            <StatCard label="Pago no mês" value={fmtCurrency(totalDespesasPagas)} accent="#E38B84" />
            <StatCard label="Pendente no mês" value={fmtCurrency(totalDespesasPendentes)} accent="#E3B455" />
          </div>
          <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 12 }}>
            <PrimaryBtn onClick={onAddBill}><Plus size={16} /> Nova despesa</PrimaryBtn>
          </div>
          {monthBillsSorted.length === 0 ? (
            <EmptyState icon={Receipt} title="Nenhuma despesa lançada neste mês" sub="Registre os custos do escritório: salários, energia, manutenção, etc." />
          ) : (
            <div style={{ background: "#161D19", border: "1px solid #232B25", borderRadius: 12, overflow: "hidden" }}>
              <table>
                <thead><tr><th>Descrição</th><th>Categoria</th><th>Data</th><th>Valor</th><th>Status</th><th></th></tr></thead>
                <tbody>
                  {monthBillsSorted.map((b) => (
                    <tr key={b.id}>
                      <td style={{ fontWeight: 600, color: "#F2F0E6" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          {b.recurring && <Repeat size={12} color="#6B7268" />}
                          {b.description}
                        </div>
                      </td>
                      <td>{b.category || "—"}</td>
                      <td style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10 }}>{fmtDate(b.date)}</td>
                      <td>{fmtCurrency(b.amount)}</td>
                      <td><FinanceStatusBadge status={b.status} /></td>
                      <td>
                        <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
                          <button onClick={() => onEditBill(b)} style={iconBtnStyle}><Pencil size={14} /></button>
                          <button onClick={() => { if (confirm("Remover esta despesa?")) onDeleteBill(b.id); }} style={iconBtnStyle}><Trash2 size={14} /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function FinanceModal({ data, clients, team, onSave, onClose }) {
  const isEdit = !!data?.id;
  const [form, setForm] = useState({
    clientId: clients[0]?.id || "", amount: "", date: new Date().toISOString().slice(0, 10),
    referenceMonth: new Date().toISOString().slice(0, 7), status: "pago", type: "mensalidade",
    responsibleGestorId: "", recurring: false,
    ...(data || {}),
  });
  const canSave = form.clientId && Number(form.amount) > 0 && form.date
    && (form.type === "mensalidade" || form.responsibleGestorId);
  const needsResponsible = form.type !== "mensalidade";
  return (
    <Modal title={data?.id ? "Editar honorário" : "Novo honorário"} onClose={onClose}>
      <Field label="Cliente">
        <select style={inputStyle} value={form.clientId} onChange={(e) => setForm({ ...form, clientId: e.target.value })}>
          <option value="">Selecione…</option>
          {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </Field>
      <Field label="Tipo">
        <select style={inputStyle} value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
          <option value="mensalidade">Mensalidade</option>
          <option value="projeto">Projeto</option>
          <option value="analise_solo">Análise de Solo</option>
        </select>
      </Field>
      {needsResponsible && (
        <Field label="Gestor responsável pelo projeto/análise">
          <select style={inputStyle} value={form.responsibleGestorId} onChange={(e) => setForm({ ...form, responsibleGestorId: e.target.value })}>
            <option value="">Selecione…</option>
            {team.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
        </Field>
      )}
      <div style={{ fontSize: 10, color: "#6B7268", marginTop: -6, marginBottom: 8 }}>
        Honorários de "Projeto" ou "Análise de Solo" pagos geram automaticamente pró-labore pro gestor responsável escolhido acima, na aba Pró-labore.
      </div>
      <Field label="Valor (R$)">
        <input type="number" style={inputStyle} value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} placeholder="Ex: 1500" />
      </Field>
      <Field label="Data do pagamento">
        <input type="date" style={inputStyle} value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
      </Field>
      <Field label="Competência (mês de referência)">
        <input type="month" style={inputStyle} value={form.referenceMonth} onChange={(e) => setForm({ ...form, referenceMonth: e.target.value })} />
      </Field>
      <Field label="Status">
        <select style={inputStyle} value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
          <option value="pago">Pago</option>
          <option value="pendente">Pendente</option>
        </select>
      </Field>
      {!isEdit && (
        <Field label="Recorrência">
          <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 10.5, color: "#D6D3C7", cursor: "pointer" }}>
            <input type="checkbox" checked={form.recurring} onChange={(e) => setForm({ ...form, recurring: e.target.checked })} />
            Repetir todo mês (lança automaticamente os próximos {RECURRING_MONTHS_AHEAD} meses, como pendente)
          </label>
        </Field>
      )}
      <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 8 }}>
        <GhostBtn onClick={onClose}>Cancelar</GhostBtn>
        <PrimaryBtn onClick={() => canSave && onSave(form)}>Salvar</PrimaryBtn>
      </div>
    </Modal>
  );
}

function ReconciliationModal({
  finances, bills, clients, categoryMemory,
  onConfirmMatch, onConfirmBillMatch, onCreateFromTransaction, onCreateBillFromTransaction, onClose,
}) {
  const [rows, setRows] = useState(null);
  const [fileName, setFileName] = useState("");
  const [error, setError] = useState("");
  const [confirmedIds, setConfirmedIds] = useState([]);
  const [fetchingBank, setFetchingBank] = useState(false);
  const [categoryDrafts, setCategoryDrafts] = useState({});
  const fileInputRef = useRef(null);

  function buildRows(transactions) {
    setRows(matchBankTransactions(transactions, finances, bills, categoryMemory));
    setCategoryDrafts({});
  }

  async function handleFile(file) {
    setError("");
    try {
      const text = await file.text();
      const transactions = parseBankStatement(file.name, text);
      if (transactions.length === 0) {
        setError('Não consegui reconhecer nenhum lançamento nesse arquivo. Confira se é um extrato exportado como CSV ou OFX ("Open Financial Exchange") pelo internet banking.');
        return;
      }
      setFileName(file.name);
      buildRows(transactions);
    } catch {
      setError("Não foi possível ler o arquivo.");
    }
  }

  async function handleFetchBank() {
    setError("");
    setFetchingBank(true);
    const r = await fetchBBExtrato({});
    setFetchingBank(false);
    if (r.error) { setError(r.error); return; }
    const transactions = r.data?.transactions || [];
    if (transactions.length === 0) {
      setError("A busca no banco não retornou nenhum lançamento pro período (mês atual).");
      return;
    }
    setFileName("Banco do Brasil — busca automática");
    buildRows(transactions);
  }

  function handleConfirmFinance(match, transaction) {
    onConfirmMatch(match, transaction);
    setConfirmedIds((ids) => [...ids, match.id]);
  }

  function handleConfirmBill(match, transaction) {
    onConfirmBillMatch(match, transaction);
    setConfirmedIds((ids) => [...ids, match.id]);
  }

  const categorySuggestions = Array.from(new Set([...BILL_CATEGORY_SUGGESTIONS, ...Object.values(categoryMemory || {})]));

  return (
    <Modal title="Conciliar extrato bancário" onClose={onClose} maxWidth={760}>
      {!rows ? (
        <>
          <div style={{ fontSize: 10.5, color: "#9BA298", marginBottom: 14 }}>
            Busque automaticamente do Banco do Brasil, ou envie o extrato exportado do internet banking (CSV ou OFX). O sistema procura, entre os honorários e despesas com status "Pendente", algum com o mesmo valor de cada lançamento (entrada ou saída).
          </div>
          <PrimaryBtn onClick={handleFetchBank} disabled={fetchingBank} style={{ marginBottom: 14 }}>
            {fetchingBank ? "Buscando…" : "Buscar automaticamente (Banco do Brasil)"}
          </PrimaryBtn>
          <div style={{ fontSize: 10, color: "#6B7268", marginBottom: 8 }}>ou envie um arquivo:</div>
          <input ref={fileInputRef} type="file" accept=".csv,.ofx,.txt" onChange={(e) => e.target.files[0] && handleFile(e.target.files[0])} style={{ fontSize: 10.5, color: "#D6D3C7" }} />
          {error && <div style={{ fontSize: 10.5, color: "#E38B84", marginTop: 10 }}>{error}</div>}
        </>
      ) : (
        <div>
          <div style={{ fontSize: 10, color: "#6B7268", marginBottom: 12 }}>{fileName} · {rows.length} lançamento(s) encontrado(s)</div>
          {rows.length === 0 ? (
            <div style={{ color: "#6B7268", fontSize: 10.5 }}>Nenhum lançamento encontrado no extrato.</div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8, maxHeight: 560, overflowY: "auto" }}>
              {rows.map((r, i) => {
                const isConfirmed = r.match && confirmedIds.includes(r.match.id);
                const isCredit = r.kind === "credit";
                const client = isCredit && r.match ? clients.find((c) => c.id === r.match.clientId) : null;
                const draftCategory = categoryDrafts[i] ?? r.suggestedCategory ?? "";
                return (
                  <div key={i} style={{ background: "#10140F", border: "1px solid #212922", borderRadius: 8, padding: 10 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10.5, color: "#D6D3C7", marginBottom: 2 }}>
                      <span>
                        <span style={{
                          display: "inline-block", fontSize: 8.5, fontWeight: 700, textTransform: "uppercase",
                          color: isCredit ? "#7BC142" : "#E38B84", marginRight: 6,
                        }}>
                          {isCredit ? "Entrada" : "Saída"}
                        </span>
                        {fmtDate(r.transaction.date)} · {r.transaction.description || "—"}
                      </span>
                      <strong>{fmtCurrency(r.transaction.amount)}</strong>
                    </div>
                    {r.transaction.counterpartyDoc && (
                      <div style={{ fontSize: 9.5, color: "#6B7268", marginBottom: 6 }}>
                        CPF/CNPJ da contraparte: {r.transaction.counterpartyDoc}
                      </div>
                    )}

                    {isConfirmed ? (
                      <div style={{ fontSize: 9.5, color: "#7BC142" }}>
                        {isCredit ? `Conciliado com ${client?.name || "—"}` : "Despesa conciliada"}
                      </div>
                    ) : isCredit ? (
                      r.match ? (
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
                          <span style={{ fontSize: 9.5, color: "#7BC142" }}>
                            Combina com: {client?.name || "—"} ({fmtCurrency(r.match.amount)}, {r.match.referenceMonth})
                          </span>
                          <GhostBtn onClick={() => handleConfirmFinance(r.match, r.transaction)}>Confirmar pagamento</GhostBtn>
                        </div>
                      ) : (
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
                          <span style={{ fontSize: 9.5, color: "#E3B455" }}>Nenhum honorário pendente com esse valor</span>
                          <GhostBtn onClick={() => onCreateFromTransaction(r.transaction)}>Lançar honorário</GhostBtn>
                        </div>
                      )
                    ) : r.match ? (
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
                        <span style={{ fontSize: 9.5, color: "#7BC142" }}>
                          Combina com despesa: {r.match.description} ({fmtCurrency(r.match.amount)})
                        </span>
                        <GhostBtn onClick={() => handleConfirmBill(r.match, r.transaction)}>Confirmar pagamento</GhostBtn>
                      </div>
                    ) : (
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                        <input
                          style={{ ...inputStyle, width: 180, fontSize: 10 }}
                          list={`recon-cat-${i}`}
                          placeholder="Categoria"
                          value={draftCategory}
                          onChange={(e) => setCategoryDrafts((d) => ({ ...d, [i]: e.target.value }))}
                        />
                        <datalist id={`recon-cat-${i}`}>
                          {categorySuggestions.map((c) => <option key={c} value={c} />)}
                        </datalist>
                        <GhostBtn onClick={() => onCreateBillFromTransaction(r.transaction, draftCategory)}>Lançar despesa</GhostBtn>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
      <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 14 }}>
        <GhostBtn onClick={onClose}>Fechar</GhostBtn>
      </div>
    </Modal>
  );
}

function BonusModal({ data, team, clients, onSave, onClose }) {
  const [form, setForm] = useState({
    gestorId: team[0]?.id || "", clientId: "", description: "", amount: "",
    date: new Date().toISOString().slice(0, 10),
    ...(data || {}),
  });
  const canSave = form.gestorId && form.description.trim() && Number(form.amount) > 0 && form.date;
  return (
    <Modal title={data?.id ? "Editar bonificação" : "Nova bonificação"} onClose={onClose}>
      <div style={{ fontSize: 10, color: "#6B7268", marginTop: -4, marginBottom: 14 }}>
        Use só pra valores fora da regra padrão (R$/ha + % de projeto/análise de solo). Honorários do tipo "Projeto" ou "Análise de Solo" já geram pró-labore automaticamente pro gestor responsável escolhido no lançamento.
      </div>
      <Field label="Gestor">
        <select style={inputStyle} value={form.gestorId} onChange={(e) => setForm({ ...form, gestorId: e.target.value })}>
          <option value="">Selecione…</option>
          {team.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
        </select>
      </Field>
      <Field label="Cliente relacionado (opcional)">
        <select style={inputStyle} value={form.clientId || ""} onChange={(e) => setForm({ ...form, clientId: e.target.value })}>
          <option value="">Sem cliente vinculado</option>
          {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </Field>
      <Field label="Descrição">
        <input style={inputStyle} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Ex: Ajuste pontual combinado com o cliente" />
      </Field>
      <Field label="Valor (R$)">
        <input type="number" style={inputStyle} value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} placeholder="Ex: 500" />
      </Field>
      <Field label="Data">
        <input type="date" style={inputStyle} value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
      </Field>
      <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 8 }}>
        <GhostBtn onClick={onClose}>Cancelar</GhostBtn>
        <PrimaryBtn onClick={() => canSave && onSave(form)}>Salvar</PrimaryBtn>
      </div>
    </Modal>
  );
}

const BILL_CATEGORY_SUGGESTIONS = ["Salários", "Energia Elétrica", "Água", "Aluguel", "Manutenção de Máquinas e Equipamentos", "Combustível", "Internet/Telefone", "Material de Escritório", "Impostos", "Outros"];

function BillModal({ data, categoryMemory, onSave, onClose }) {
  const isEdit = !!data?.id;
  const [form, setForm] = useState({
    description: "", category: "", amount: "", date: new Date().toISOString().slice(0, 10),
    referenceMonth: new Date().toISOString().slice(0, 7), status: "pendente", recurring: false,
    ...(data || {}),
  });
  const canSave = form.description.trim() && Number(form.amount) > 0 && form.date;
  return (
    <Modal title={isEdit ? "Editar despesa" : "Nova despesa"} onClose={onClose}>
      <Field label="Descrição">
        <input style={inputStyle} value={form.description} onChange={(e) => {
          const description = e.target.value;
          setForm((f) => {
            if (f.category) return { ...f, description };
            const suggestion = (categoryMemory || {})[normalizeDescription(description)];
            return suggestion ? { ...f, description, category: suggestion } : { ...f, description };
          });
        }} placeholder="Ex: Energia elétrica — sede" />
      </Field>
      <Field label="Categoria">
        <input style={inputStyle} list="bill-categories" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} placeholder="Ex: Energia Elétrica" />
        <datalist id="bill-categories">
          {BILL_CATEGORY_SUGGESTIONS.map((c) => <option key={c} value={c} />)}
        </datalist>
      </Field>
      <Field label="Valor (R$)">
        <input type="number" style={inputStyle} value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} placeholder="Ex: 350" />
      </Field>
      <Field label="Data (vencimento ou pagamento)">
        <input type="date" style={inputStyle} value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
      </Field>
      <Field label="Competência (mês de referência)">
        <input type="month" style={inputStyle} value={form.referenceMonth} onChange={(e) => setForm({ ...form, referenceMonth: e.target.value })} />
      </Field>
      <Field label="Status">
        <select style={inputStyle} value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
          <option value="pago">Pago</option>
          <option value="pendente">Pendente</option>
        </select>
      </Field>
      {!isEdit && (
        <Field label="Recorrência">
          <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 10.5, color: "#D6D3C7", cursor: "pointer" }}>
            <input type="checkbox" checked={form.recurring} onChange={(e) => setForm({ ...form, recurring: e.target.checked })} />
            Repetir todo mês (lança automaticamente os próximos {RECURRING_MONTHS_AHEAD} meses, como pendente)
          </label>
        </Field>
      )}
      <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 8 }}>
        <GhostBtn onClick={onClose}>Cancelar</GhostBtn>
        <PrimaryBtn onClick={() => canSave && onSave(form)}>Salvar</PrimaryBtn>
      </div>
    </Modal>
  );
}

function TeamMemberModal({ data, avatarUrl, error, onSave, onClose }) {
  const isEdit = !!data?.id;
  const [form, setForm] = useState(data || { name: "", title: "Técnico agrícola", phone: "", email: "", password: "" });
  const [avatarPreview, setAvatarPreview] = useState(avatarUrl || null);
  const [avatarError, setAvatarError] = useState("");
  const fileInputRef = useRef(null);
  const canSave = form.name.trim() && (isEdit || (form.email.trim() && form.password.length >= 6));

  async function handlePhotoChange(file) {
    if (!file) return;
    setAvatarError("");
    try {
      const dataUrl = await resizeImageToDataUrl(file, 160);
      setAvatarPreview(dataUrl);
      setForm((f) => ({ ...f, avatarDataUrl: dataUrl }));
    } catch (err) {
      setAvatarError(err.message || "Não foi possível processar a imagem.");
    }
  }
  function handleRemovePhoto() {
    setAvatarPreview(null);
    setForm((f) => ({ ...f, avatarDataUrl: null }));
  }

  return (
    <Modal title={isEdit ? "Editar colaborador" : "Novo colaborador"} onClose={onClose}>
      <Field label="Foto">
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <Avatar name={form.name} url={avatarPreview} size={48} />
          <GhostBtn type="button" onClick={() => fileInputRef.current?.click()}>Escolher foto</GhostBtn>
          {avatarPreview && <GhostBtn type="button" onClick={handleRemovePhoto}>Remover</GhostBtn>}
          <input ref={fileInputRef} type="file" accept="image/*" style={{ display: "none" }} onChange={(e) => handlePhotoChange(e.target.files[0])} />
        </div>
        {avatarError && <div style={{ fontSize: 10.5, color: "#E38B84", marginTop: 6 }}>{avatarError}</div>}
      </Field>
      <Field label="Nome">
        <input style={inputStyle} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Ex: Carlos Mendes" />
      </Field>
      <Field label="Função">
        <select style={inputStyle} value={form.title || ""} onChange={(e) => setForm({ ...form, title: e.target.value })}>
          {TEAM_ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
        </select>
      </Field>
      <Field label="Telefone">
        <input style={inputStyle} value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="(00) 00000-0000" />
      </Field>
      <Field label="E-mail (usado para login)">
        <input type="email" disabled={isEdit} style={{ ...inputStyle, opacity: isEdit ? 0.6 : 1 }}
          value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="nome@exemplo.com" />
      </Field>
      {!isEdit && (
        <Field label="Senha temporária (informe ao colaborador)">
          <input type="text" style={inputStyle} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="mín. 6 caracteres" />
        </Field>
      )}
      {error && (
        <div style={{ background: "#3A1414", color: "#E38B84", padding: "9px 12px", borderRadius: 8, fontSize: 10.5, marginBottom: 14 }}>{error}</div>
      )}
      <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 8 }}>
        <GhostBtn onClick={onClose}>Cancelar</GhostBtn>
        <PrimaryBtn onClick={() => canSave && onSave(form)}>Salvar</PrimaryBtn>
      </div>
    </Modal>
  );
}

function ColaboradorCreatedModal({ data, onClose }) {
  return (
    <Modal title="Colaborador criado" onClose={onClose}>
      <p style={{ color: "#D6D3C7", fontSize: 11, lineHeight: 1.6, marginTop: 0 }}>
        Envie estes dados para <strong>{data.name}</strong> (por WhatsApp, por exemplo).
        Essa senha é temporária — ainda não existe uma tela para o colaborador trocá-la sozinho no app.
      </p>
      <Field label="E-mail de acesso">
        <div style={inputStyle}>{data.email}</div>
      </Field>
      <Field label="Senha temporária">
        <div style={{ ...inputStyle, fontFamily: "'IBM Plex Mono', monospace", fontWeight: 700 }}>{data.password}</div>
      </Field>
      <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 8 }}>
        <PrimaryBtn onClick={onClose}>Concluído, já anotei</PrimaryBtn>
      </div>
    </Modal>
  );
}

function ClientAccessModal({ clientId, clientName, error, onSave, onClose }) {
  const [form, setForm] = useState({ clientId, name: clientName || "", email: "", phone: "", password: "" });
  const canSave = form.name.trim() && form.email.trim() && form.password.length >= 6;
  return (
    <Modal title="Criar acesso do cliente" onClose={onClose}>
      <div style={{ fontSize: 10, color: "#6B7268", marginTop: -4, marginBottom: 14 }}>
        Cria um login para <strong>{clientName}</strong> acessar suas fazendas, talhões, visitas e documentos — sem poder editar nada.
      </div>
      <Field label="Nome">
        <input style={inputStyle} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Ex: João da Silva" />
      </Field>
      <Field label="Telefone">
        <input style={inputStyle} value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="(00) 00000-0000" />
      </Field>
      <Field label="E-mail (usado para login)">
        <input type="email" style={inputStyle} value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="nome@exemplo.com" />
      </Field>
      <Field label="Senha temporária (informe ao cliente)">
        <input type="text" style={inputStyle} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="mín. 6 caracteres" />
      </Field>
      {error && (
        <div style={{ background: "#3A1414", color: "#E38B84", padding: "9px 12px", borderRadius: 8, fontSize: 10.5, marginBottom: 14 }}>{error}</div>
      )}
      <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 8 }}>
        <GhostBtn onClick={onClose}>Cancelar</GhostBtn>
        <PrimaryBtn onClick={() => canSave && onSave(form)}>Salvar</PrimaryBtn>
      </div>
    </Modal>
  );
}

function shoelaceAreaHa(points, metersPerPixel) {
  if (points.length < 3 || !metersPerPixel) return 0;
  let sum = 0;
  for (let i = 0; i < points.length; i++) {
    const p1 = points[i];
    const p2 = points[(i + 1) % points.length];
    sum += p1.x * p2.y - p2.x * p1.y;
  }
  const areaPx2 = Math.abs(sum) / 2;
  const areaM2 = areaPx2 * metersPerPixel * metersPerPixel;
  return areaM2 / 10000;
}

function geodesicAreaHa(latlngPoints) {
  if (latlngPoints.length < 3) return 0;
  const R = 6378137;
  const d2r = Math.PI / 180;
  let area = 0;
  for (let i = 0; i < latlngPoints.length; i++) {
    const p1 = latlngPoints[i];
    const p2 = latlngPoints[(i + 1) % latlngPoints.length];
    area += (p2.lng - p1.lng) * d2r * (2 + Math.sin(p1.lat * d2r) + Math.sin(p2.lat * d2r));
  }
  area = (Math.abs(area) * R * R) / 2;
  return area / 10000;
}

function parseKmlPolygon(kmlText) {
  const parser = new DOMParser();
  const xml = parser.parseFromString(kmlText, "text/xml");
  if (xml.querySelector("parsererror")) throw new Error("Arquivo KML inválido.");
  const coordsEl = xml.querySelector("Polygon coordinates") || xml.querySelector("coordinates");
  if (!coordsEl || !coordsEl.textContent.trim()) throw new Error("Nenhum polígono encontrado no arquivo.");
  const tuples = coordsEl.textContent.trim().split(/\s+/).filter(Boolean);
  let points = tuples
    .map((t) => {
      const parts = t.split(",");
      return { lng: parseFloat(parts[0]), lat: parseFloat(parts[1]) };
    })
    .filter((p) => !isNaN(p.lat) && !isNaN(p.lng));
  if (points.length > 1) {
    const first = points[0];
    const last = points[points.length - 1];
    if (Math.abs(first.lat - last.lat) < 1e-9 && Math.abs(first.lng - last.lng) < 1e-9) {
      points = points.slice(0, -1);
    }
  }
  if (points.length < 3) throw new Error("O polígono do KML precisa de pelo menos 3 pontos.");
  return points;
}

function projectLatLngForPreview(points, width, height, padding) {
  const lats = points.map((p) => p.lat);
  const lngs = points.map((p) => p.lng);
  const minLat = Math.min(...lats), maxLat = Math.max(...lats);
  const minLng = Math.min(...lngs), maxLng = Math.max(...lngs);
  const avgLat = (minLat + maxLat) / 2;
  const cosLat = Math.cos((avgLat * Math.PI) / 180) || 1;
  const spanX = (maxLng - minLng) * cosLat || 0.0001;
  const spanY = maxLat - minLat || 0.0001;
  const scale = Math.min((width - 2 * padding) / spanX, (height - 2 * padding) / spanY);
  return points.map((p) => ({
    x: padding + (p.lng - minLng) * cosLat * scale,
    y: height - padding - (p.lat - minLat) * scale,
  }));
}

function FieldMapModal({ initialData, onSave, onClose }) {
  const imgRef = useRef(null);
  const fileInputRef = useRef(null);
  const kmlInputRef = useRef(null);

  const [mode, setMode] = useState(initialData?.mode || "image");

  // image mode state
  const [imageDataUrl, setImageDataUrl] = useState(initialData?.mode === "image" ? initialData.imageDataUrl : null);
  const [naturalSize, setNaturalSize] = useState(initialData?.mode === "image" ? { width: initialData.width, height: initialData.height } : { width: 0, height: 0 });
  const [displaySize, setDisplaySize] = useState({ width: 0, height: 0 });
  const [imgPoints, setImgPoints] = useState(initialData?.mode === "image" && initialData.points ? initialData.points.map(([x, y]) => ({ x, y })) : []);
  const [realWidth, setRealWidth] = useState(initialData?.mode === "image" && initialData.realWidthMeters ? String(initialData.realWidthMeters) : "");

  // kml mode state
  const [kmlPoints, setKmlPoints] = useState(initialData?.mode === "kml" && initialData.points ? initialData.points.map(([lat, lng]) => ({ lat, lng })) : []);
  const [kmlFileName, setKmlFileName] = useState(initialData?.mode === "kml" ? initialData.sourceName || "" : "");
  const [kmlError, setKmlError] = useState("");

  useEffect(() => {
    function measure() {
      if (imgRef.current) {
        setDisplaySize({ width: imgRef.current.clientWidth, height: imgRef.current.clientHeight });
      }
    }
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [imageDataUrl]);

  function handleFile(file) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      setImageDataUrl(e.target.result);
      setImgPoints([]);
      const img = new Image();
      img.onload = () => setNaturalSize({ width: img.naturalWidth, height: img.naturalHeight });
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  }

  function handleKmlFile(file) {
    if (!file) return;
    setKmlError("");
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const parsed = parseKmlPolygon(e.target.result);
        setKmlPoints(parsed);
        setKmlFileName(file.name);
      } catch (err) {
        setKmlError(err.message || "Não foi possível ler este arquivo KML.");
        setKmlPoints([]);
      }
    };
    reader.readAsText(file);
  }

  const metersPerPixel = naturalSize.width && realWidth ? Number(realWidth) / naturalSize.width : 0;
  const imgAreaHa = shoelaceAreaHa(imgPoints, metersPerPixel);
  const kmlAreaHa = geodesicAreaHa(kmlPoints);

  function toDisplay(p) {
    if (!naturalSize.width || !displaySize.width) return { x: 0, y: 0 };
    const ratio = displaySize.width / naturalSize.width;
    return { x: p.x * ratio, y: p.y * ratio };
  }

  function handleContainerClick(e) {
    if (!imgRef.current || !naturalSize.width) return;
    const rect = imgRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;
    if (clickX < 0 || clickY < 0 || clickX > rect.width || clickY > rect.height) return;
    const ratio = naturalSize.width / rect.width;
    setImgPoints((prev) => [...prev, { x: clickX * ratio, y: clickY * ratio }]);
  }

  function handleUndo() { setImgPoints((prev) => prev.slice(0, -1)); }
  function handleClear() { setImgPoints([]); }
  function handleChangeImage() {
    setImageDataUrl(null);
    setImgPoints([]);
    setNaturalSize({ width: 0, height: 0 });
  }
  function handleClearKml() {
    setKmlPoints([]);
    setKmlFileName("");
    setKmlError("");
  }

  function handleSave() {
    if (mode === "image") {
      if (imgPoints.length < 3) return;
      onSave({
        mode: "image",
        imageDataUrl,
        points: imgPoints.map((p) => [p.x, p.y]),
        width: naturalSize.width,
        height: naturalSize.height,
        realWidthMeters: realWidth ? Number(realWidth) : null,
        areaHa: metersPerPixel ? imgAreaHa : null,
      });
    } else {
      if (kmlPoints.length < 3) return;
      onSave({
        mode: "kml",
        points: kmlPoints.map((p) => [p.lat, p.lng]),
        sourceName: kmlFileName,
        areaHa: kmlAreaHa,
      });
    }
  }

  const screenPoints = imgPoints.map(toDisplay);
  const polyStr = screenPoints.map((p) => `${p.x},${p.y}`).join(" ");
  const kmlPreviewPoints = kmlPoints.length >= 3 ? projectLatLngForPreview(kmlPoints, 700, 360, 30) : [];
  const kmlPolyStr = kmlPreviewPoints.map((p) => `${p.x},${p.y}`).join(" ");

  const canSave = mode === "image" ? imgPoints.length >= 3 : kmlPoints.length >= 3;

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }} onClick={onClose}>
      <div style={{ background: "#161D19", borderRadius: 14, width: "100%", maxWidth: 780, border: "1px solid #232B25", overflow: "hidden", maxHeight: "92vh", overflowY: "auto" }} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 18px", borderBottom: "1px solid #212922" }}>
          <h3 style={{ margin: 0, fontFamily: "'Manrope', sans-serif", fontSize: 14.5, fontWeight: 700, color: "#F2F0E6" }}>Definir área do talhão</h3>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "#6B7268" }}><X size={18} /></button>
        </div>

        <div style={{ padding: "14px 18px 0", display: "flex", gap: 8 }}>
          <button type="button" onClick={() => setMode("image")} style={{
            flex: 1, padding: "8px 12px", borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: "pointer",
            border: "1px solid " + (mode === "image" ? "#1E4A20" : "#232B25"),
            background: mode === "image" ? "#1E4A20" : "#10140F", color: mode === "image" ? "#F5F2E8" : "#D6D3C7"
          }}>Enviar imagem</button>
          <button type="button" onClick={() => setMode("kml")} style={{
            flex: 1, padding: "8px 12px", borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: "pointer",
            border: "1px solid " + (mode === "kml" ? "#1E4A20" : "#232B25"),
            background: mode === "kml" ? "#1E4A20" : "#10140F", color: mode === "kml" ? "#F5F2E8" : "#D6D3C7"
          }}>Importar KML</button>
        </div>

        {mode === "image" && (
          !imageDataUrl ? (
            <div style={{ padding: 22 }}>
              <div style={{ fontSize: 11, color: "#9BA298", marginBottom: 14, lineHeight: 1.6 }}>
                Este ambiente não permite carregar mapas de serviços externos direto aqui dentro. Envie um print de satélite da propriedade:
                <br />1. Abra o Google Maps ou Google Earth no seu celular ou computador.
                <br />2. Mude para visualização de satélite e aproxime até enquadrar o talhão.
                <br />3. Tire um print e envie a imagem abaixo.
              </div>
              <div
                onClick={() => fileInputRef.current?.click()}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => { e.preventDefault(); handleFile(e.dataTransfer.files[0]); }}
                style={{ border: "1.5px dashed #2E362F", borderRadius: 10, padding: "40px 20px", textAlign: "center", cursor: "pointer", color: "#9BA298" }}
              >
                <MapPin size={22} style={{ marginBottom: 8, opacity: 0.6 }} />
                <div style={{ fontSize: 12.5, fontWeight: 600, color: "#D6D3C7", marginBottom: 4 }}>Clique para enviar ou arraste a imagem aqui</div>
                <div style={{ fontSize: 10.5 }}>PNG ou JPG</div>
                <input ref={fileInputRef} type="file" accept="image/*" style={{ display: "none" }} onChange={(e) => handleFile(e.target.files[0])} />
              </div>
            </div>
          ) : (
            <>
              <div style={{ padding: "10px 18px 0", fontSize: 10.5, color: "#6B7268" }}>
                Clique sobre a imagem para marcar cada vértice do talhão — o polígono fecha sozinho a partir de 3 pontos.
              </div>
              <div style={{ padding: "10px 18px", position: "relative" }}>
                <div style={{ position: "relative", display: "inline-block", maxWidth: "100%" }} onClick={handleContainerClick}>
                  <img
                    ref={imgRef}
                    src={imageDataUrl}
                    alt=""
                    draggable={false}
                    style={{ display: "block", width: "100%", maxHeight: 440, objectFit: "contain", borderRadius: 8, userSelect: "none", cursor: "crosshair" }}
                  />
                  <svg width={displaySize.width} height={displaySize.height} style={{ position: "absolute", left: 0, top: 0, pointerEvents: "none" }}>
                    {imgPoints.length >= 2 && (
                      <polygon points={polyStr} fill={imgPoints.length >= 3 ? "rgba(123,193,66,0.28)" : "none"} stroke="#7BC142" strokeWidth="2" />
                    )}
                    {screenPoints.map((p, i) => (
                      <circle key={i} cx={p.x} cy={p.y} r={5} fill="#7BC142" stroke="#0E1310" strokeWidth="1.5" />
                    ))}
                  </svg>
                </div>
              </div>
              <div style={{ padding: "0 18px", display: "flex", gap: 8, flexWrap: "wrap" }}>
                <GhostBtn type="button" onClick={handleUndo}>Desfazer ponto</GhostBtn>
                <GhostBtn type="button" onClick={handleClear}>Limpar pontos</GhostBtn>
                <GhostBtn type="button" onClick={handleChangeImage}>Trocar imagem</GhostBtn>
              </div>
              <div style={{ padding: "16px 18px 0" }}>
                <Field label="Largura real da imagem (metros, aproximado)">
                  <input type="number" style={inputStyle} value={realWidth} onChange={(e) => setRealWidth(e.target.value)} placeholder="Ex: 500" />
                </Field>
                <div style={{ fontSize: 10, color: "#6B7268", marginTop: -8, marginBottom: 4 }}>
                  Usado só para calcular a área em hectares. Veja a escala/régua do Google Maps na imagem para estimar essa distância.
                </div>
              </div>
            </>
          )
        )}

        {mode === "kml" && (
          kmlPoints.length === 0 ? (
            <div style={{ padding: 22 }}>
              <div style={{ fontSize: 11, color: "#9BA298", marginBottom: 14, lineHeight: 1.6 }}>
                Se você já tem o contorno do talhão em algum software (John Deere Operations Center, Climate FieldView, drone, etc.), exporte como <strong>KML</strong> (arquivo .kml, não .kmz) e envie aqui. A área é calculada com as coordenadas exatas do arquivo, sem precisar de mapa.
              </div>
              <div
                onClick={() => kmlInputRef.current?.click()}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => { e.preventDefault(); handleKmlFile(e.dataTransfer.files[0]); }}
                style={{ border: "1.5px dashed #2E362F", borderRadius: 10, padding: "40px 20px", textAlign: "center", cursor: "pointer", color: "#9BA298" }}
              >
                <ClipboardList size={22} style={{ marginBottom: 8, opacity: 0.6 }} />
                <div style={{ fontSize: 12.5, fontWeight: 600, color: "#D6D3C7", marginBottom: 4 }}>Clique para enviar ou arraste o arquivo .kml aqui</div>
                <div style={{ fontSize: 10.5 }}>Arquivo KML (não KMZ)</div>
                <input ref={kmlInputRef} type="file" accept=".kml" style={{ display: "none" }} onChange={(e) => handleKmlFile(e.target.files[0])} />
              </div>
              {kmlError && <div style={{ fontSize: 11, color: "#E3B455", marginTop: 10 }}>{kmlError}</div>}
            </div>
          ) : (
            <>
              <div style={{ padding: "10px 18px 0", fontSize: 10.5, color: "#6B7268" }}>
                Polígono importado de <strong>{kmlFileName}</strong> — pré-visualização (sem imagem de fundo, escala aproximada):
              </div>
              <div style={{ padding: "10px 18px" }}>
                <svg width="100%" height="360" viewBox="0 0 700 360" style={{ background: "#0E1310", borderRadius: 8, border: "1px solid #232B25" }}>
                  <polygon points={kmlPolyStr} fill="rgba(123,193,66,0.28)" stroke="#7BC142" strokeWidth="2" />
                  {kmlPreviewPoints.map((p, i) => (
                    <circle key={i} cx={p.x} cy={p.y} r={4} fill="#7BC142" stroke="#0E1310" strokeWidth="1.5" />
                  ))}
                </svg>
              </div>
              <div style={{ padding: "0 18px", display: "flex", gap: 8, flexWrap: "wrap" }}>
                <GhostBtn type="button" onClick={handleClearKml}>Enviar outro arquivo</GhostBtn>
              </div>
            </>
          )
        )}

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 18px", borderTop: "1px solid #212922", marginTop: 8 }}>
          <span style={{ fontSize: 11, color: "#9BA298" }}>
            {mode === "image"
              ? imgPoints.length >= 3
                ? metersPerPixel
                  ? `Área do polígono: ${imgAreaHa.toFixed(2)} ha (${imgPoints.length} pontos)`
                  : `${imgPoints.length} pontos marcados — informe a largura real para calcular a área`
                : imgPoints.length > 0
                ? `Marque pelo menos 3 pontos (${imgPoints.length} até agora)`
                : imageDataUrl
                ? "Clique na imagem para começar a marcar o talhão"
                : ""
              : kmlPoints.length >= 3
              ? `Área do polígono: ${kmlAreaHa.toFixed(2)} ha (${kmlPoints.length} pontos, coordenadas exatas)`
              : "Envie um arquivo KML com o contorno do talhão"}
          </span>
          <div style={{ display: "flex", gap: 8 }}>
            <GhostBtn type="button" onClick={onClose}>Cancelar</GhostBtn>
            <PrimaryBtn type="button" onClick={handleSave} style={!canSave ? { opacity: 0.5, cursor: "not-allowed" } : {}}>
              Usar este polígono
            </PrimaryBtn>
          </div>
        </div>
      </div>
    </div>
  );
}
