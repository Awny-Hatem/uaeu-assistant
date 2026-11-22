---
title: TEMPLATE FOR SUBMITTING A PAPER TO
sourceUrl: https://www.uaeu.ac.ae/en/cbe/research/publications/pdf/2013/wp_2013_02.pdf
status: approved
language: en
lastVerified: 2026-11-04
subject: university-people
college: College of Business and Economics
catalogYear: not stated
temporalStatus: undated-current-page
audience: public; exact eligibility as published in sections
topicId: /cbe/research/publications/pdf/2013/wp_2013_02.pdf
extraction: text-extracted-layout-review-required
sourceSha256: 70d07e515f5b908b5f7828de644b65db81286558d87deba35db5a5b961cdcb8f
sourceDate: not inferred from verification date
---
# TEMPLATE FOR SUBMITTING A PAPER TO

Source applicability: undated-current-page. Verification date confirms access, not the effective date of every rule. Undated, legacy and cohort facts must retain their labels.

## PDF page 1
ISSN 2079-7141

1





                   UAEU-CBE-Working Paper Series


      Title: On Option Pricing in Illiquid Markets with
                                        Random Jumps



Author(s): Youssef El-Khatib and Abdulnasser Hatemi-J

Department: Economics and Finance

No. 2013-02

Series Founding and Acting Editor: Prof. Dr. Abdulnasser Hatemi-J
Copyright © 2011 by the UAE University. All rights reserved. No part of this paper may be reproduced in any form,
or stored in a retrieval system, without prior permission of the authors.

The views and conclusions expressed in this working paper are strictly those of the author(s) and do not necessarily
represent, and should not be reported as, those of the CBE/UAEU. The CBE and the editor take no responsibility for
any errors, omissions in, or for the correctness of, the information contained in this working paper.








                                                       1

## PDF page 2
ON OPTION PRICING IN ILLIQUID MARKETS WITH RANDOM JUMPS


             Youssef El-Khatib, Department of Mathematical Sciences, UAE University
                              Al-Ain, P.O. Box 17551, United Arab Emirates
                                    Email: youssef_elkhatib@uaeu.ac.ae


          Abdulnasser Hatemi-J, Department of Economics and Finance, UAE University
                              Al-Ain, P.O. Box 17555, United Arab Emirates
                                         Email: AHatemi@uaeu.ac.ae




    Abstract. One of the shortcomings of the Black and Scholes model on option pricing is
    the assumption that trading of the underlying asset does not affect the price of that asset.
    This asumption can be fulfilled only in perfectly liquid markets. Since most markets are
    illqiud, this asumption might be too restrictive. Thus, taking into account the price impact
    in option pricing is an important issue. This issue has been dealt with, to some extent, for
    illiquid  markets     by  assuming  a     continuous     process,  mainly  based  on        the  Brownian
    motion. However, the recent financial crisis and its effects on               the  global stock markets
    have propagated the urgent need for more realistic models where the stochastic process
    describing the price trajectories involves           random    jumps.    Nontheless,    works related to
    markets  with  jumps  are        scant  compared      to  the  continuous     ones.  In  addition,     these
    prevoius studies do not deal with illiquid markets. The contribution of this paper is to
    tackle   the pricing problem for options in illiquid markets with jumps                    as well as the
    hedging strategy within this context, which is the first of its kind to the best knowledge.

    Keywords: Options pricing, illiquid markets, jump diffusion, incomplete markets.


    JEL classification: G12, G13.





                                                          2

## PDF page 3
2   Introduction

Financial derivatives are important tools for dealing with financial risk. An option is an example
of such derivatives, which gives the right but not the obligation, to engage in a future transaction
on some underlying financial asset. For instance,              a European call option on          an  asset  with the

price              is a contract between two agents (buyer and seller), which gives the holder the
right to buy    the asset at a pre-specified future time               (the expiration date) for an amount           K
(called the strike price). The buyer of the option is not obliged to exercise the option. When the
contract is issued the      buyer of the option needs to pay a certain             amount of money called the

premium.  The  payoff        for  this  option  is   defined  as                                                .  The
writer of the option receives a premium that is invested in the combination of the risky and risk
free assets. The pricing      problem is then to determine the premium, i.e.              the price that    the seller
should charge for this option.

    The pricing problem has been solved in the pioneer work of Black and Scholes (1973). One
of the  shortcomings      of the Black and Scholes model is the assumption that an option trader
cannot  affect  the  underlying  asset  price.  However,  it  is  well-known  that  in  a  market  with
imperfect liquidity, trading does affect the underlying asset price                 see, for example (Chan         and
Lakonishok, 1995; Keim and Madhavan, 1996; and Sharpe, Alexander and Bailey, 1999).

    Liu  and  Yong  (2005)        study  the  effect  of  the  replication  of  a  European  option  on  the
underlying asset price. They obtain a generalization of the Black                 and Scholes pricing P.D.E. as
the following:


  (   )                                (   )            (   )           (   )               (1)
              (   (   )    (   ))





                                                                                                     (2)


                                                           3

## PDF page 4
where             is the price impact function of the trader. The classical Black–Scholes P.D.E. is a

special case of (2) when                   .

    There are also      several    other papers     that  have  studied the financial markets  with  jumps
(among others, Merton, 1976; El-Khatib and Privault, 2003; and Wu and Zeng 2006). However,
none of the previous studies based on the jump-diffusion approach deals with illiquid markets, to
the best knowledge. This paper is extends             the model of      Liu and Yong (2005) by including             a
jump-diffusion structure in the underlying option pricing model. This appears to be an important
issue because the model that is suggested in this paper allows for the possibility to account for
sudden and random significant changes in the market that might not be captured by the existing
models in the literature such as the continuous model suggested by Liu and Yong (2005). Hence,
the approach that is developed in this paper is expected to be                    more   useful   in financial risk
management, especially in the cases in which the financial markets are under stress.

    The   disposition of the      rest of the   paper is    the following. Section 2 introduces the jump-
diffusion model for an       illiquid market. Section 3 deals with the pricing problem of an option
within the context of a jump-diffusion           model along with the proof for the            suggested solution.
Section 4 concludes the paper.



3   A Jump-Diffusion Model for Illiquid Markets

We start with presenting some          necessary denotations. Let                     be a Poisson process with

deterministic intensity         . Let  also                    be its associated compensated process.             The

variable              denotes a Brownian motion. The probability space of interest is                            with

             and                being   independent.     Let               signify   the filtration generated by

             and              . The market is assumed to have two assets—                   namely    a risky asset

denoted by                and a risk-free asset denoted by                   . The maturity is        and the strike

is    . As in Liu and Yong (2005), we assume                that  the return on the risk free asset indiractly


                                                          4

## PDF page 5
depends on          and the option trader's trading in the stock market has a direct impact on the stock

price. This price impact, which an investor can cuase by trading on an asset, functions in such
way that it increases the price when buying the asset and it deacreases the price when selling the
asset.

The price of the risk-free asset is given by
                                                                                                                             (3)

 where            denotes the interest rate. The price of the risky asset is generated by the following
stochastic differential equation:

                                                                                                                             (4)


 where       and       represent the expected return and volatility, respectively, the term a represents
a real constant and                  denotes the price impact factor created by the                 trader via selling or

buygin the underlying asset.              is the number of shares that the trader has in the stock at time                    .

Hence,                  captures the price impact of the trading. Before dealing with the pricing of a

European option in a jump-diffusion illiquid market, we need to observe the following remark.

Remark 1 The parameter                in (4) determines the direction of the jumps1. In fact the following

can be stated:
             • If        , the jumps are pushing the stock price down, i.e. the stock price is decreasing
at each jump.
             • If        , then there are no jumps and therefore model (4) is reduced to the model in
Liu and Yong (2005).
             • If        , the jumps are pushing the stock price up, i.e. the stock price is increasing at
each jump.






1
 It affects also the size of the jumps.
                                                              5

## PDF page 6
4   Pricing of a European Option in a Jump-Diffusion Illiquid Market

Let              be the wealth process for the trader. Let aslo                         denote the number of shares

invested in the risk-free asset. Then, the value of the portfolio is given by
                                                                                                                           (5)

Assume that the number of shares of the risky asset satisfies the following condition:
                                                                                                                           (6)

Let us consider a European call option with the payoff defined as                                            . In order to

replicate the option for a perfect hedge, we search for a strategy                                       , which, at the

expiration date of the optrion, leads to having a value of the underlying wealth to be equal to the
payoff, that is                  . Then, we can state the following corollary.

Corollary 1 The wealth process for the trader of the jump-diffusion model in section 2 satisfies
the following stochastic differential equation :


                                                                                                                           (7)


Proof of Collary 1. By using equations (3), (4), (5) and (6) we have the following:











 which ends the proof.






                                                             6

## PDF page 7
Our aim in this paper is to price the European option with payoff                             where         is given by

equation (4). We replicate the European option by searching a wealth                                   which leads to

the terminal value                    . Thus, as in Liu and Yong (2005), we need to solve the following
system of stochastic differential equations.










                                                                                                                        (8)


The above system is called FBSDE (forward-backward stochastic differential equations) system.
In order to derive the P.D.E. for the European option price, we need Itô formula, which is given
by the following lemma (see Protter, 1990).

Lemma 1 Let          ,  , and      be three adapted processes such that



Let                    be the process defined by



For any function                              , we have




                                                                                                                        (9)


Equation (9) can also be written in the following format:




                                                            7

## PDF page 8
(10)

The next proposition provides the P.D.E. for the price of                    the European option in the jump-
diffusion illiquid market as presented in section 2.

Proposition 1 Let                 denote the price of the European option at time                         for the

model presented in section 2. Then the coresponding P.D.E. for the underlying option price is
given by







with the terminal condition
Moreover, the market is incomplete and there is no strategy leading to the terminal wealth
                             in the current context. Thus, the number of shares                   that minimizes the
variance of the difference between the wealth and the payoff is given by





Proof of Proposition 1.  Let                     be an adapted solution of the FBSDE (8) and assume that

there exists a smooth function                                   such that               represents the price of the

European option at time                   . Since the price of the option at maturity is equal to the payoff,

then                        . Now, using Itô formula (10) we obtain





                                                            8

## PDF page 9
(11)


By comparing equations (7) and (11) one can deduce that it is impossible to find a strategy
                that results in the     terminal wealth                                    . Thus, we put the term

belonging to          in equations (7) and (11) equal to each other,               which gives the P.D.E. of the
option  price  and      then    we  minimize  the  distance  between  the  wealth                       and  the  price

                       over the number of shares of the underlying asset, i.e.                   . The P.D.E. of the
option price in this case is



                                                                                                                       (12)




with the terminal condition



To find the number of shares             invested in        we need to solve the following problem:


                                                                                                                       (13)


By using (7), (11) and (12) we have








                                                            9

## PDF page 10
where




The minimum is obtained at                      , wich yield the following result:



and




which ends the proof.

         It is worth mentioning that in the case where there are                    no jumps, i.e. when                     ,
then              and the P.D.E. in the previous proposition is reduced to the P.D.E. that is obtained
in Liu and Yong (2005), assuming there are no dividends.












                                                            10

## PDF page 11
5   Conclusions


Option pricing is an integral part of modern risk management in increasingly globalized financial
markets. The classical Black and Scholes model is regularly used for this purpose. However, one
of the   main   pillars that makes this model operational is the                underlying     assumption that the
markets  are  perfectly  liquid.       This  assumption  is,      nonetheless,     not   fulfilled  in  reality   since
perfectly liquid markets do not exist.           In our opinion the question          should    not  be  whether the
markets are illiquid or not, the question should be              about the degree of illiquidity. Thus, taking
into account the fact that markets are illiquid can improve on the precision of the underlying
option pricing.

This paper    is the first attempt, to our best knowledge, that               extends the existing literature on
option pricing by introducing a jump-diffusion model for illiquid markets. This seems to be a
more realistic approach to deal with a market that is incomplete. A solution for the option pricing
within this context is provided along with the underlying proof. The suggested solution might be
useful to investors in order to determine             the  optimal value of an option in a market that is
characterized by illiquidity.






















                                                          11

## PDF page 12
References

         Black, F.; Scholes, M. (1973): The Pricing of Options and Corporate Liabilities.  Journal
of Political Economy 81 (3): pp. 637-654.
         Chan, L., Lakonishok, J. (1995):  The behavior of stock prices around institutional trades.
Journal of Finance 50: pp. 1147-1174.
         El-Khatib,  Y.,  Privault,  N.  (2003):        Hedging  in  complete  market  driven  by  normal
martingales.  Applicationes Mathematicae 30(2), pp. 147-172.
         Keim,  D.,  Madhavan,  A.  (1996):            The  upstairs  market  for  large-block  transactions:
analysis and measurement of price effects.  Review of Financial Studies 9: pp. 1-36.
         Liu H., Yong, J. (2005): Option pricing with an illiquid underlying asset market,  Journal
of Economic Dynamics and Control 29: pp. 2125-2156.
         Merton,    R. C. (1976): Option pricing when underlying stock returns are discontinuous,
Journal of Financial Economics, 3: pp. 125-144.
         Protter, Ph. (1990):     Stochastic integration and differential equations. A new approach.
Springer-Verlag, Berlin.
         Sharpe, W.F., Alexander,          G.J., Bailey, J.V.(1999):        Investments.      Prentice Hall, New
Jersey.
         Wu S. Zeng Y. (2006) The term structure of interest rates under regime shifts and jumps
Economics Letters, 93(2), 215-221.


















                                                          12
